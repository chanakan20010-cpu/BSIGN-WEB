import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { createApp } from "../server/app.js";
import { startPreview } from "../server/preview.js";

test("normal server does not expose first-admin setup", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "bsign-no-setup-"));
  const { app, db } = createApp({ directory });
  try {
    assert.equal((await request(app).get("/api/setup")).status, 404);
    assert.equal((await request(app).get("/api/local-account")).status, 404);
    assert.throws(
      () =>
        createApp({
          directory,
          initialSetupToken: randomBytes(32).toString("hex"),
        }),
      /local preview/,
    );
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("local account recovery requires launcher capability and CSRF, revokes sessions and preserves content", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "bsign-recovery-"));
  let runtime;
  try {
    runtime = await startPreview({ directory });
    const { origin, token } = runtime;
    const owner = request.agent(origin),
      recovery = request.agent(origin),
      stranger = request.agent(origin);
    const csrf = (await owner.get("/api/session")).body.csrf;
    const credentials = {
      email: "owner@example.test",
      password: randomBytes(24).toString("hex"),
    };
    const created = await owner
      .post("/api/setup")
      .set("Origin", origin)
      .set("X-CSRF-Token", csrf)
      .set("X-BSIGN-Setup", token)
      .send(credentials);
    assert.equal(created.status, 201);
    const before = (await owner.get("/api/content")).body;
    const recoveryCsrf = (await recovery.get("/api/session")).body.csrf;
    assert.equal((await stranger.get("/api/local-account")).status, 403);
    assert.deepEqual(
      (await recovery.get("/api/local-account").set("X-BSIGN-Setup", token))
        .body.accounts,
      [{ email: credentials.email }],
    );
    const replacement = {
      ...credentials,
      password: randomBytes(24).toString("hex"),
    };
    const reset = (key, csrfValue, originValue = origin, body = replacement) =>
      recovery
        .post("/api/local-account")
        .set("Origin", originValue)
        .set("X-CSRF-Token", csrfValue)
        .set("X-BSIGN-Setup", key)
        .send(body);
    assert.equal((await reset("invalid", recoveryCsrf)).status, 403);
    assert.equal((await reset(token, "invalid")).status, 403);
    assert.equal(
      (await reset(token, recoveryCsrf, "https://attacker.test")).status,
      403,
    );
    assert.equal(
      (
        await reset(token, recoveryCsrf, origin, {
          ...replacement,
          password: "short",
        })
      ).status,
      400,
    );
    assert.equal((await reset(token, recoveryCsrf)).status, 200);
    assert.equal((await owner.get("/api/admin/documents")).status, 401);
    const loginCsrf = (await recovery.get("/api/session")).body.csrf;
    const login = (body) =>
      recovery
        .post("/api/login")
        .set("Origin", origin)
        .set("X-CSRF-Token", loginCsrf)
        .send(body);
    assert.equal((await login(credentials)).status, 401);
    assert.equal((await login(replacement)).status, 200);
    assert.equal((await recovery.get("/api/admin/documents")).status, 200);
    assert.deepEqual((await recovery.get("/api/content")).body, before);
    assert.equal(runtime.db.prepare("SELECT count(*) n FROM users").get().n, 1);
    assert.equal(
      runtime.db
        .prepare(
          "SELECT count(*) n FROM audit WHERE action='local-account:password-reset'",
        )
        .get().n,
      1,
    );
  } finally {
    if (runtime) await runtime.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("preview uses a free loopback port, protected setup, exclusive first admin and persistent data", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "bsign-preview-"));
  const stateFile = path.join(directory, "private-state.json");
  let runtime;
  try {
    runtime = await startPreview({ directory, stateFile });
    const { origin, token } = runtime;
    assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.equal(JSON.parse(readFileSync(stateFile)).token, token);
    const a = request.agent(origin),
      b = request.agent(origin);
    let csrf = (await a.get("/api/session")).body.csrf;
    let csrfB = (await b.get("/api/session")).body.csrf;
    const post = (agent, t, key, body) =>
      agent
        .post("/api/setup")
        .set("Origin", origin)
        .set("X-CSRF-Token", t)
        .set("X-BSIGN-Setup", key)
        .send(body);
    const body = {
      email: "preview@example.test",
      password: randomBytes(24).toString("hex"),
    };
    assert.equal((await a.get("/api/setup")).status, 403);
    assert.equal((await post(a, csrf, "invalid", body)).status, 403);
    assert.equal(
      (await a.get("/api/health").set("Host", "attacker.test")).status,
      403,
    );
    assert.equal(
      (
        await a
          .post("/api/setup")
          .set("Origin", origin)
          .set("X-BSIGN-Setup", token)
          .send(body)
      ).status,
      403,
    );
    assert.equal(
      (await a.get("/api/setup").set("X-BSIGN-Setup", token)).body.needsSetup,
      true,
    );
    const [first, second] = await Promise.all([
      post(a, csrf, token, body),
      post(b, csrfB, token, { ...body, email: "second@example.test" }),
    ]);
    assert.deepEqual([first.status, second.status].sort(), [201, 409]);
    assert.equal(runtime.db.prepare("SELECT count(*) n FROM users").get().n, 1);
    const owner = first.status === 201 ? a : b;
    csrf = (first.status === 201 ? first : second).body.csrf;
    assert.equal((await owner.get("/api/admin/documents")).status, 200);
    assert.equal(
      (await post(owner, csrf, token, { ...body, email: "third@example.test" }))
        .status,
      409,
    );
    const home = (await owner.get("/api/admin/documents")).body.home;
    assert.equal(
      (
        await owner
          .patch("/api/admin/documents/home")
          .set("Origin", origin)
          .set("X-CSRF-Token", csrf)
          .send({
            revision: home.revision,
            patch: { intro: { th: "ข้อมูลพรีวิวคงอยู่" } },
          })
      ).status,
      200,
    );
    assert.equal((await fetch(origin + "/__preview/status")).status, 403);
    await runtime.close();
    runtime = null;
    assert.equal(existsSync(stateFile), false);
    runtime = await startPreview({ directory, stateFile });
    assert.notEqual(runtime.token, token);
    const status = await (
      await fetch(runtime.origin + "/__preview/status", {
        headers: { "X-BSIGN-Preview": runtime.token },
      })
    ).json();
    assert.equal(status.needsSetup, false);
    const content = await (await fetch(runtime.origin + "/api/content")).json();
    assert.equal(content.home.intro.th, "ข้อมูลพรีวิวคงอยู่");
    assert.equal(
      (
        await fetch(runtime.origin + "/api/setup", {
          headers: { "X-BSIGN-Setup": token },
        })
      ).status,
      403,
    );
  } finally {
    if (runtime) await runtime.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
