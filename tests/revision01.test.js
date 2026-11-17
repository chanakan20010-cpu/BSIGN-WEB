import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { createApp } from "../server/app.js";
import { defaults } from "../server/seed.js";
import { hashPassword } from "../server/security.js";
import { createBackup } from "../scripts/backup.js";
import { restoreBackup } from "../scripts/restore.js";

const origin = "http://localhost:3000";
const copy = (value) => structuredClone(value);
async function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "bsign-revision-01-"));
  const directory = path.join(root, "data");
  let runtime = createApp({ directory, origin, limits: false });
  const password = randomBytes(24).toString("hex");
  runtime.db
    .prepare("INSERT INTO users(email,password) VALUES(?,?)")
    .run("owner@example.test", await hashPassword(password));
  let owner, csrf;
  async function login() {
    owner = request.agent(runtime.app);
    const token = (await owner.get("/api/session")).body.csrf;
    const response = await owner
      .post("/api/login")
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .send({ email: "owner@example.test", password });
    assert.equal(response.status, 200);
    csrf = response.body.csrf;
  }
  await login();
  return {
    root,
    directory,
    get db() {
      return runtime.db;
    },
    get app() {
      return runtime.app;
    },
    get owner() {
      return owner;
    },
    send(method, url, body) {
      return owner[method](url)
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf)
        .send(body);
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

test("maintenance is revision-safe, private-site APIs close while admin login works, and settings survive restart/restore", async () => {
  const f = await fixture();
  try {
    const documents = (await f.owner.get("/api/admin/documents")).body;
    assert.equal(documents.maintenance.value.enabled, false);
    assert.equal(
      (await request(f.app).get("/api/status")).body.maintenance.enabled,
      false,
    );
    const guest = request.agent(f.app);
    const guestToken = (await guest.get("/api/session")).body.csrf;
    assert.equal(
      (
        await guest
          .patch("/api/admin/documents/maintenance")
          .set("Origin", origin)
          .set("X-CSRF-Token", guestToken)
          .send({
            revision: documents.maintenance.revision,
            patch: { enabled: true },
          })
      ).status,
      401,
    );
    assert.equal(
      (
        await f.owner
          .patch("/api/admin/documents/maintenance")
          .set("Origin", origin)
          .send({ revision: 1, patch: { enabled: true } })
      ).status,
      403,
    );
    const saved = await f.send("patch", "/api/admin/documents/maintenance", {
      revision: documents.maintenance.revision,
      patch: {
        enabled: true,
        title: { th: "กำลังปรับปรุงเว็บไซต์" },
        message: { th: "ข้อความปิดปรับปรุงเฉพาะองค์กร" },
        futureSetting: { keep: true },
      },
    });
    assert.equal(saved.status, 200);
    assert.equal(
      saved.body.value.message.en,
      documents.maintenance.value.message.en,
    );
    assert.equal(
      (
        await f.send("patch", "/api/admin/documents/maintenance", {
          revision: documents.maintenance.revision,
          patch: { enabled: false },
        })
      ).status,
      409,
    );
    const content = await request(f.app).get("/api/content");
    assert.equal(content.status, 200);
    assert.deepEqual(Object.keys(content.body).sort(), [
      "global",
      "maintenance",
      "styles",
    ]);
    assert.deepEqual(Object.keys(content.body.global).sort(), [
      "brand",
      "favicon",
      "languages",
    ]);
    assert.equal(
      content.body.maintenance.message.th,
      saved.body.value.message.th,
    );
    assert.equal(content.body.maintenance.futureSetting, undefined);
    assert.equal(content.headers["cache-control"], "no-store");
    for (const url of ["/api/articles", "/api/articles/company-launch"]) {
      const response = await f.owner.get(url);
      assert.equal(response.status, 503);
      assert.equal(response.body.error, "MAINTENANCE");
      assert.equal(response.headers["retry-after"], "300");
    }
    for (const url of ["/api/contact", "/api/subscribe"])
      assert.equal((await f.send("post", url, {})).status, 503);
    assert.equal((await f.owner.get("/api/admin/articles")).status, 200);
    assert.equal(
      (await f.owner.get("/api/admin/overview")).body.maintenance.value.enabled,
      true,
    );
    await f.restart();
    assert.equal(
      (await f.owner.get("/api/admin/documents")).body.maintenance.value
        .enabled,
      true,
    );
    assert.equal(
      (await request(f.app).get("/api/content")).body.home,
      undefined,
    );
    const backup = path.join(f.root, "backup");
    const restored = path.join(f.root, "restored");
    await createBackup(f.directory, backup);
    restoreBackup(backup, restored);
    const restoredRuntime = createApp({
      directory: restored,
      origin,
      limits: false,
    });
    try {
      assert.deepEqual(
        (await request(restoredRuntime.app).get("/api/status")).body
          .maintenance,
        content.body.maintenance,
      );
    } finally {
      restoredRuntime.db.close();
    }
    const current = (await f.owner.get("/api/admin/documents")).body
      .maintenance;
    const opened = await f.send("patch", "/api/admin/documents/maintenance", {
      revision: current.revision,
      patch: { enabled: false },
    });
    assert.equal(opened.status, 200);
    assert.equal(opened.body.value.futureSetting.keep, true);
    assert.ok((await request(f.app).get("/api/content")).body.home);
    assert.equal((await request(f.app).get("/api/articles")).status, 200);
  } finally {
    f.close();
  }
});

test("article paragraphs validate images/layout, remain searchable and preserve newer blocks when an older client saves", async () => {
  const f = await fixture();
  try {
    const base = (await f.owner.get("/api/admin/articles")).body[0];
    const { id, revision, ...article } = base;
    const block = {
      id: "paragraph-one",
      text: { th: "ย่อหน้าที่ค้นหาได้เฉพาะเนื้อหา", en: "uniqueblocksearch" },
      image: {
        url: "/uploads/example.webp",
        alt: { th: "ภาพประกอบ", en: "Illustration" },
        crop: null,
      },
      align: "right",
      ratio: "4:3",
    };
    const created = await f.send("post", "/api/admin/articles", {
      ...article,
      slug: "structured-paragraphs",
      status: "published",
      publishedAt: "2020-01-01T00:00:00.000Z",
      blocks: [block],
    });
    assert.equal(created.status, 201);
    const current = created.body;
    assert.deepEqual(current.blocks, [block]);
    assert.equal(
      (await request(f.app).get("/api/articles?lang=en&q=uniqueblocksearch"))
        .body.total,
      1,
    );
    const partial = await f.send("patch", "/api/admin/articles/" + current.id, {
      revision: current.revision,
      patch: {
        blocks: [
          {
            id: block.id,
            text: { th: "แก้เฉพาะภาษาไทย" },
            futureLayout: { retained: true },
          },
        ],
      },
    });
    assert.equal(partial.status, 200);
    assert.equal(partial.body.blocks[0].text.en, block.text.en);
    assert.equal(partial.body.blocks[0].image.url, block.image.url);
    const older = await f.send("patch", "/api/admin/articles/" + current.id, {
      revision: partial.body.revision,
      patch: { title: { th: "ชื่อจาก client เก่า" } },
    });
    assert.equal(older.status, 200);
    assert.deepEqual(older.body.blocks, partial.body.blocks);
    for (const blocks of [
      [{ ...block, ratio: "unsafe-ratio" }],
      [{ ...block, align: "float-anywhere" }],
      [{ ...block, image: { ...block.image, url: "javascript:alert(1)" } }],
      [block, block],
    ]) {
      assert.equal(
        (
          await f.send("patch", "/api/admin/articles/" + current.id, {
            revision: older.body.revision,
            patch: { blocks },
          })
        ).status,
        400,
      );
    }
    assert.equal(
      (
        await f.send("patch", "/api/admin/articles/" + current.id, {
          revision: older.body.revision,
          patch: null,
        })
      ).status,
      400,
    );
    writeFileSync(
      path.join(f.directory, "uploads", "example.webp"),
      "example-image-bytes",
    );
    const backup = path.join(f.root, "paragraph-backup"),
      restored = path.join(f.root, "paragraph-restored");
    await createBackup(f.directory, backup);
    restoreBackup(backup, restored);
    const runtime = createApp({ directory: restored, origin, limits: false });
    try {
      const restoredArticle = (
        await request(runtime.app).get("/api/articles/structured-paragraphs")
      ).body;
      assert.deepEqual(restoredArticle.blocks, older.body.blocks);
      assert.equal(
        readFileSync(path.join(restored, "uploads", "example.webp"), "utf8"),
        "example-image-bytes",
      );
    } finally {
      runtime.db.close();
    }
    await f.restart();
    assert.deepEqual(
      (await request(f.app).get("/api/articles/structured-paragraphs")).body
        .blocks,
      older.body.blocks,
    );
  } finally {
    f.close();
  }
});

test("additive migration updates untouched icon appearances once and preserves customized data", async () => {
  const f = await fixture();
  try {
    const oldIcons = copy(defaults.icons);
    oldIcons.overrides = {
      "home.hero.arrow": { ...oldIcons.shared.arrow, futureFlag: true },
      "social.0": { ...oldIcons.shared.line, color: "#123456" },
    };
    oldIcons.shared.search.color = "#654321";
    const contact = (await f.owner.get("/api/admin/documents")).body.contact
      .value;
    contact.socials[1].icon = "facebook";
    f.db
      .prepare("UPDATE documents SET value=? WHERE key='icons'")
      .run(JSON.stringify(oldIcons));
    f.db
      .prepare("UPDATE documents SET value=? WHERE key='contact'")
      .run(JSON.stringify(contact));
    f.db
      .prepare("UPDATE documents SET value=? WHERE key='home'")
      .run(JSON.stringify({ ...defaults.home, futureField: "keep me" }));
    f.db.prepare("DELETE FROM documents WHERE key='maintenance'").run();
    f.db.prepare("DELETE FROM migrations WHERE version=2").run();
    await f.restart();
    const docs = (await f.owner.get("/api/admin/documents")).body;
    assert.equal(docs.maintenance.value.enabled, false);
    assert.equal(docs.home.value.futureField, "keep me");
    assert.equal(
      docs.icons.value.overrides["home.hero.arrow"].background,
      "transparent",
    );
    assert.equal(
      docs.icons.value.overrides["home.hero.arrow"].futureFlag,
      true,
    );
    assert.equal(
      docs.icons.value.overrides["cta.arrow"].background,
      "transparent",
    );
    assert.equal(
      docs.icons.value.overrides["news.card.arrow"].background,
      "transparent",
    );
    assert.equal(docs.icons.value.overrides["social.2"].color, "#0866FF");
    assert.deepEqual(
      docs.icons.value.overrides["social.0"],
      oldIcons.overrides["social.0"],
    );
    assert.equal(docs.icons.value.overrides["social.1"], undefined);
    assert.equal(docs.icons.value.overrides["news.search"], undefined);
    assert.equal(docs.icons.value.shared.search.color, "#654321");
    assert.equal(
      f.db.prepare("SELECT max(version) version FROM migrations").get().version,
      3,
    );
    const revision = docs.icons.revision;
    const customized = await f.send("patch", "/api/admin/documents/icons", {
      revision,
      patch: { overrides: { "cta.arrow": { background: "#123456" } } },
    });
    assert.equal(customized.status, 200);
    await f.restart();
    const again = (await f.owner.get("/api/admin/documents")).body.icons;
    assert.equal(again.value.overrides["cta.arrow"].background, "#123456");
    assert.equal(again.revision, customized.body.revision);
  } finally {
    f.close();
  }
});

test("icon backgrounds accept only transparent or HEX while foreground colors stay HEX", async () => {
  const f = await fixture();
  try {
    const icons = (await f.owner.get("/api/admin/documents")).body.icons;
    const changed = await f.send("patch", "/api/admin/documents/icons", {
      revision: icons.revision,
      patch: { shared: { arrow: { background: "transparent" } } },
    });
    assert.equal(changed.status, 200);
    for (const patch of [
      { shared: { arrow: { background: "url(https://attacker.test/x)" } } },
      { shared: { arrow: { color: "transparent" } } },
    ])
      assert.equal(
        (
          await f.send("patch", "/api/admin/documents/icons", {
            revision: changed.body.revision,
            patch,
          })
        ).status,
        400,
      );
  } finally {
    f.close();
  }
});
