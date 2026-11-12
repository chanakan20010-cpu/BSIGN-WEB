import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const suffix = randomUUID().slice(0, 8),
  name = "bsign-smoke-" + suffix,
  volume = name + "-data";
const docker = (...args) =>
  execFileSync("docker", ["--host=unix:///var/run/docker.sock", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
const origin = "http://localhost:33217";
async function ready() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(origin + "/api/health");
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw Error("Container did not become ready");
}
const start = () =>
  docker(
    "run",
    "-d",
    "--name",
    name,
    "-p",
    "127.0.0.1:33217:3000",
    "-e",
    "APP_ORIGIN=" + origin,
    "-v",
    volume + ":/app/.data",
    "bsign-web:1.0.0",
  );
try {
  docker("volume", "create", volume);
  start();
  await ready();
  const res = await fetch(origin + "/api/session");
  const cookie = res.headers.get("set-cookie").split(";")[0];
  const { csrf } = await res.json();
  const r = await fetch(origin + "/api/contact", {
    method: "POST",
    headers: {
      Origin: origin,
      Cookie: cookie,
      "X-CSRF-Token": csrf,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Docker Test",
      email: "docker@example.test",
      message: "Persistent Docker smoke test",
      consent: true,
    }),
  });
  assert.equal(r.status, 201);
  assert.equal((await fetch(origin + "/")).status, 200);
  docker("rm", "-f", name);
  start();
  await ready();
  const count = docker(
    "exec",
    name,
    "node",
    "--input-type=module",
    "-e",
    "import{DatabaseSync}from'node:sqlite';const db=new DatabaseSync('/app/.data/site.sqlite');console.log(db.prepare('SELECT count(*) n FROM contacts').get().n);db.close();",
  ).trim();
  assert.equal(count, "1");
  const uid = docker("exec", name, "id", "-u").trim();
  assert.notEqual(uid, "0");
  console.log(
    "PASS: Docker HTTP/API, non-root runtime, persistent data after container replacement",
  );
} finally {
  try {
    docker("rm", "-f", name);
  } catch {}
  try {
    docker("volume", "rm", volume);
  } catch {}
}
