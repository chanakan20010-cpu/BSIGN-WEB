// A local-only entry point for the desktop launcher. Production startup does not
// enable initial account creation or desktop control endpoints.
import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  writeFileSync,
  renameSync,
  rmSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import express from "express";
import { createApp } from "./app.js";
import { version } from "./version.js";
export async function startPreview({
  stateFile,
  directory = path.resolve(process.env.DATA_DIR || ".data"),
} = {}) {
  if (!existsSync("dist/index.html")) throw Error("Preview build is missing");
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const token = randomBytes(32).toString("hex");
  let app, db;
  try {
    ({ app, db } = createApp({
      directory,
      origin,
      secure: false,
      localPreview: true,
      initialSetupToken: token,
    }));
  } catch (e) {
    server.close();
    throw e;
  }
  let stopping = false;
  const close = async () => {
    if (stopping) return;
    stopping = true;
    if (stateFile) rmSync(stateFile, { force: true });
    await new Promise((resolve) => server.close(resolve));
    db.close();
  };
  app.use(express.static("dist"));
  app.get("/{*path}", (_q, r) => r.sendFile(path.resolve("dist/index.html")));
  // Control endpoints are handled outside Express API routes and require a
  // launcher capability. Neither the token nor the readiness file is public.
  server.on("request", (q, r) => {
    if (q.url?.startsWith("/__preview/")) {
      r.setHeader("Cache-Control", "no-store");
      const supplied = q.headers["x-bsign-preview"] || "";
      if (
        q.headers.host !== new URL(origin).host ||
        typeof supplied !== "string" ||
        Buffer.byteLength(supplied) !== Buffer.byteLength(token) ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))
      ) {
        r.writeHead(403);
        r.end();
        return;
      }
      if (q.method === "GET" && q.url === "/__preview/status") {
        r.setHeader("Content-Type", "application/json");
        r.end(
          JSON.stringify({
            product: "BSIGN-LOCAL-PREVIEW",
            version,
            pid: process.pid,
            needsSetup: !db.prepare("SELECT 1 FROM users LIMIT 1").get(),
          }),
        );
        return;
      }
      if (q.method === "POST" && q.url === "/__preview/stop") {
        r.writeHead(200);
        r.end();
        setImmediate(() => close());
        return;
      }
      r.writeHead(404);
      r.end();
      return;
    }
    app(q, r);
  });
  if (stateFile) {
    mkdirSync(path.dirname(stateFile), { recursive: true });
    const partial = stateFile + ".tmp";
    writeFileSync(
      partial,
      JSON.stringify({ origin, token, pid: process.pid, version }),
      { mode: 0o600 },
    );
    renameSync(partial, stateFile);
  }
  return { origin, token, db, close, server };
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  const stateFile = process.argv[2];
  if (!stateFile) throw Error("A private launcher state path is required");
  const runtime = await startPreview({ stateFile: path.resolve(stateFile) });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => runtime.close());
}
