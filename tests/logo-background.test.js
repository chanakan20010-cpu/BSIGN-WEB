import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import { createBackup } from "../scripts/backup.js";
import { restoreBackup } from "../scripts/restore.js";
import { logoBackground } from "../src/logo-appearance.js";

const origin = "http://localhost:3000";
async function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "bsign-logo-background-"));
  const directory = path.join(root, "data");
  let runtime = createApp({ directory, origin, limits: false });
  const password = randomBytes(24).toString("hex");
  runtime.db
    .prepare("INSERT INTO users(email,password) VALUES(?,?)")
    .run("logo-owner@example.test", await hashPassword(password));
  let owner, csrf;
  async function login() {
    owner = request.agent(runtime.app);
    const token = (await owner.get("/api/session")).body.csrf;
    const response = await owner
      .post("/api/login")
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .send({ email: "logo-owner@example.test", password });
    assert.equal(response.status, 200);
    csrf = response.body.csrf;
  }
  await login();
  return {
    root,
    directory,
    get app() {
      return runtime.app;
    },
    async documents() {
      return (await owner.get("/api/admin/documents")).body;
    },
    async patch(patch) {
      const current = (await this.documents()).global;
      return owner
        .patch("/api/admin/documents/global")
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf)
        .send({ revision: current.revision, patch });
    },
    async restart() {
      runtime.db.close();
      runtime = createApp({ directory, origin, limits: false });
      await login();
    },
    close() {
      runtime.db.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test("logo surfaces keep legacy defaults and never accept arbitrary CSS", () => {
  assert.equal(logoBackground({}, "#ffffff"), "#ffffff");
  assert.equal(logoBackground({}, "transparent"), "transparent");
  assert.equal(logoBackground({ background: "#ABCdef" }), "#ABCdef");
  assert.equal(logoBackground({ background: "transparent" }), "transparent");
  for (const background of [
    "inherit",
    "red",
    "#fff",
    "url(https://example.test)",
    null,
    {},
  ])
    assert.equal(logoBackground({ background }, "#ffffff"), "#ffffff");
});

test("independent logo backgrounds survive older partial clients, reset, restart and backup restore", async () => {
  const f = await fixture();
  try {
    const original = (await f.documents()).global.value;
    assert.equal(
      (
        await f.patch({
          logo: { background: "#123456" },
          footerLogo: { background: "transparent" },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await f.patch({
          logo: { alt: { th: "โลโก้บริษัท" } },
          footerLogo: { alt: { en: "Company logo" } },
        })
      ).status,
      200,
    );
    let value = (await f.documents()).global.value;
    assert.equal(value.logo.background, "#123456");
    assert.equal(value.footerLogo.background, "transparent");
    assert.equal(value.logo.url, original.logo.url);
    assert.equal(value.footerLogo.url, original.footerLogo.url);
    assert.deepEqual(value.logo.crop, original.logo.crop);
    assert.equal(
      (
        await f.patch({
          logo: { background: "transparent" },
          footerLogo: { background: "#ffffff" },
        })
      ).status,
      200,
    );
    await f.restart();
    value = (await f.documents()).global.value;
    assert.equal(value.logo.background, "transparent");
    assert.equal(value.footerLogo.background, "#ffffff");
    const backup = path.join(f.root, "backup"),
      restoredDirectory = path.join(f.root, "restored");
    await createBackup(f.directory, backup);
    restoreBackup(backup, restoredDirectory);
    const restored = createApp({
      directory: restoredDirectory,
      origin,
      limits: false,
    });
    try {
      const content = (await request(restored.app).get("/api/content")).body;
      assert.deepEqual(content.global, value);
    } finally {
      restored.db.close();
    }
  } finally {
    f.close();
  }
});

test("image background validation is narrow and rejected edits do not change saved data", async () => {
  const f = await fixture();
  try {
    const before = (await f.documents()).global;
    for (const background of [
      "inherit",
      "red",
      "#fff",
      "#12345678",
      "url(https://example.test)",
      "#123456;display:none",
      null,
      42,
      {},
    ]) {
      assert.equal((await f.patch({ footerLogo: { background } })).status, 400);
      assert.deepEqual((await f.documents()).global, before);
    }
  } finally {
    f.close();
  }
});
