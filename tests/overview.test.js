import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import { version } from "../server/version.js";

async function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), "bsign-overview-"));
  const origin = "http://localhost:3000";
  const { app, db } = createApp({ directory, origin, limits: false });
  const password = randomBytes(24).toString("hex");
  db.prepare("INSERT INTO users(email,password) VALUES(?,?)").run(
    "owner@example.test",
    await hashPassword(password),
  );
  const owner = request.agent(app);
  const csrf = (await owner.get("/api/session")).body.csrf;
  const loggedIn = await owner
    .post("/api/login")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf)
    .send({ email: "owner@example.test", password });
  assert.equal(loggedIn.status, 200);
  return {
    directory,
    app,
    db,
    owner,
    password,
    close() {
      db.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("overview requires authentication and reflects current articles, messages and actual stored files", async () => {
  const f = await fixture();
  try {
    assert.equal((await request(f.app).get("/api/admin/overview")).status, 401);
    const initial = await f.owner.get("/api/admin/overview");
    assert.equal(initial.status, 200);
    assert.equal(initial.headers["cache-control"], "no-store");
    assert.equal(initial.body.system.version, version);
    assert.equal(initial.body.system.database, "SQLite");
    assert.equal(initial.body.system.healthy, true);
    assert.equal(initial.body.system.schemaVersion, 1);

    const base = JSON.parse(
      f.db.prepare("SELECT value FROM articles LIMIT 1").get().value,
    );
    f.db.prepare("DELETE FROM articles").run();
    const insertArticle = f.db.prepare(
      "INSERT INTO articles(id,value) VALUES(?,?)",
    );
    for (const [id, status, date] of [
      ["past", "published", "2020-01-01T00:00:00.000Z"],
      ["future", "published", "2099-01-01T00:00:00.000Z"],
      ["draft", "draft", "2021-01-01T00:00:00.000Z"],
    ])
      insertArticle.run(
        id,
        JSON.stringify({ ...base, status, publishedAt: date }),
      );
    f.db
      .prepare(
        "INSERT INTO contacts(id,value,status,created_at) VALUES(?,?,?,?)",
      )
      .run(
        "new-message",
        JSON.stringify({
          name: "Test Owner",
          email: "person@example.test",
          message: "Private contact body",
        }),
        "new",
        "2025-01-01T00:00:00.000Z",
      );
    f.db
      .prepare("INSERT INTO subscribers(id,email,created_at) VALUES(?,?,?)")
      .run("subscriber", "subscriber@example.test", "2025-01-01T00:00:00.000Z");
    f.db
      .prepare("INSERT INTO media VALUES(?,?,?,?,?,?)")
      .run(
        "missing.webp",
        "Missing original",
        "image/webp",
        "",
        "",
        "2025-01-01T00:00:00.000Z",
      );
    writeFileSync(
      path.join(f.directory, "uploads", "actual.webp"),
      Buffer.alloc(123),
    );
    mkdirSync(path.join(f.directory, "uploads", "folder"));
    const result = await f.owner.get("/api/admin/overview");
    assert.deepEqual(result.body.counts, {
      articles: 3,
      published: 1,
      draft: 1,
      scheduled: 1,
      contacts: 1,
      unread: 1,
      subscribers: 1,
      media: 1,
      admins: 1,
    });
    assert.equal(result.body.system.uploadsBytes, 123);
    assert.equal(result.body.recentArticles[0].id, "future");
    assert.deepEqual(result.body.recentArticles[0].image, base.image);
    assert.equal(result.body.recentContacts[0].name, "Test Owner");
    f.db.prepare("UPDATE contacts SET status='read'").run();
    f.db.prepare("DELETE FROM articles WHERE id='draft'").run();
    const changed = (await f.owner.get("/api/admin/overview")).body;
    assert.equal(changed.counts.unread, 0);
    assert.equal(changed.counts.articles, 2);
    assert.equal(changed.counts.draft, 0);
    assert.equal(changed.recentContacts[0].status, "read");
  } finally {
    f.close();
  }
});

test("overview bounds recent lists, returns configuration presence only and excludes private fields", async () => {
  const f = await fixture();
  const keys = ["SMTP_HOST", "MAIL_FROM", "MAIL_TO", "SMTP_PASSWORD"];
  const before = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const key of keys) delete process.env[key];
    assert.equal(
      (await f.owner.get("/api/admin/overview")).body.system.smtpConfigured,
      false,
    );
    const smtpSecret = randomBytes(24).toString("hex");
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.MAIL_FROM = "site@example.test";
    process.env.MAIL_TO = "inbox@example.test";
    process.env.SMTP_PASSWORD = smtpSecret;
    const base = JSON.parse(
      f.db.prepare("SELECT value FROM articles LIMIT 1").get().value,
    );
    f.db.prepare("DELETE FROM articles").run();
    for (let i = 0; i < 7; i++) {
      f.db
        .prepare("INSERT INTO articles(id,value) VALUES(?,?)")
        .run(
          "article-" + i,
          JSON.stringify({
            ...base,
            title: { th: "หัวข้อ " + i, en: "Title " + i },
            publishedAt: `2025-01-0${i + 1}T00:00:00.000Z`,
            body: { th: "Private article body", en: "Private article body" },
          }),
        );
      f.db
        .prepare(
          "INSERT INTO contacts(id,value,status,created_at) VALUES(?,?,?,?)",
        )
        .run(
          "message-" + i,
          JSON.stringify({
            name: "Contact " + i,
            email: `person${i}@example.test`,
            message: "Private contact body",
            phone: "Private phone",
          }),
          "new",
          `2025-01-0${i + 1}T00:00:00.000Z`,
        );
    }
    const response = await f.owner.get("/api/admin/overview");
    const data = response.body;
    assert.equal(data.recentArticles.length, 5);
    assert.equal(data.recentContacts.length, 3);
    assert.equal(data.recentArticles[0].id, "article-6");
    assert.equal(data.recentContacts[0].id, "message-6");
    assert.equal(data.system.smtpConfigured, true);
    for (const article of data.recentArticles)
      assert.deepEqual(Object.keys(article).sort(), [
        "id",
        "image",
        "publishedAt",
        "status",
        "title",
      ]);
    for (const contact of data.recentContacts)
      assert.deepEqual(Object.keys(contact).sort(), [
        "createdAt",
        "email",
        "id",
        "name",
        "status",
      ]);
    for (const privateValue of [
      f.directory,
      f.password,
      smtpSecret,
      "smtp.example.test",
      "Private article body",
      "Private contact body",
      "Private phone",
    ])
      assert.ok(
        !response.text.includes(privateValue),
        "Overview must not disclose private fields or configuration",
      );
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM articles").get().n, 7);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM contacts").get().n, 7);
  } finally {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
    f.close();
  }
});
