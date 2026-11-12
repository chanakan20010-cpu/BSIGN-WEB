import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { createApp } from "./app.js";
const development = process.argv.includes("--dev");
if (process.env.NODE_ENV === "production" && development)
  throw Error("Development server cannot run in production");
if (!development && !existsSync("dist/index.html"))
  throw Error("Run npm run build before npm start");
const { app, db } = createApp({ development });
if (!development) {
  app.use(express.static("dist"));
  app.get("/{*path}", (_q, r) => r.sendFile(path.resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`BSIGN TECH v1.0.0 listening on port ${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
