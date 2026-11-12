import { test, after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import { createBackup } from "../scripts/backup.js";
import { restoreBackup } from "../scripts/restore.js";
const root = mkdtempSync(path.join(tmpdir(), "bsign-api-"));
const directory = path.join(root, "data");
const origin = "http://localhost:3000";
let { app, db } = createApp({ directory, origin });
const password = randomBytes(24).toString("hex");
db.prepare("INSERT INTO users(email,password) VALUES(?,?)").run(
  "admin@example.test",
  await hashPassword(password),
);
const user = request.agent(app);
let csrf = (await user.get("/api/session")).body.csrf;
const send = (method, url, body) =>
  user[method](url).set("Origin", origin).set("X-CSRF-Token", csrf).send(body);
after(() => {
  db.close();
  rmSync(root, { recursive: true, force: true });
});
test("health and public content; no authentication leakage", async () => {
  assert.equal((await user.get("/api/health")).body.ok, true);
  const c = await user.get("/api/content");
  assert.equal(c.status, 200);
  assert.equal(c.body.global.email, "visit@bsign.work");
  assert.equal(c.body._seeded, undefined);
  assert.equal((await user.get("/api/admin/documents")).status, 401);
});
test("CSRF and origin rejection, login rotates session", async () => {
  assert.equal(
    (
      await user
        .post("/api/login")
        .send({ email: "admin@example.test", password })
    ).status,
    403,
  );
  assert.equal(
    (
      await user
        .post("/api/login")
        .set("Origin", "https://attacker.test")
        .set("X-CSRF-Token", csrf)
        .send({ email: "admin@example.test", password })
    ).status,
    403,
  );
  const r = await send("post", "/api/login", {
    email: "admin@example.test",
    password,
  });
  assert.equal(r.status, 200);
  assert.notEqual(r.body.csrf, csrf);
  csrf = r.body.csrf;
  assert.match(r.headers["set-cookie"][0], /HttpOnly/);
  assert.match(r.headers["set-cookie"][0], /SameSite=Strict/);
});
test("partial updates preserve newer keys and reject stale clients", async () => {
  let d = (await user.get("/api/admin/documents")).body.home;
  let r = await send("patch", "/api/admin/documents/home", {
    revision: d.revision,
    patch: { futureField: { enabled: true }, intro: { th: "แก้ไขสำเร็จ" } },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.value.intro.en, d.value.intro.en);
  assert.equal(
    (
      await send("patch", "/api/admin/documents/home", {
        revision: d.revision,
        patch: { intro: { th: "stale" } },
      })
    ).status,
    409,
  );
  d = r.body;
  r = await send("patch", "/api/admin/documents/home", {
    revision: d.revision,
    patch: { intro: { en: "Updated" } },
  });
  assert.equal(r.body.value.futureField.enabled, true);
  assert.equal(r.body.value.intro.th, "แก้ไขสำเร็จ");
});
test("reject invalid shapes, CSS values, XSS links and raster recoloring", async () => {
  const d = (await user.get("/api/admin/documents")).body;
  for (const patch of [
    { title: null },
    { hero: { url: "javascript:alert(1)" } },
    { title: [] },
  ])
    assert.equal(
      (
        await send("patch", "/api/admin/documents/home", {
          revision: d.home.revision,
          patch,
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await send("patch", "/api/admin/documents/styles", {
        revision: d.styles.revision,
        patch: { body: { size: 500 } },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await send("patch", "/api/admin/documents/icons", {
        revision: d.icons.revision,
        patch: {
          shared: { arrow: { asset: "/uploads/aaaa.webp", mode: "mask" } },
        },
      })
    ).status,
    400,
  );
});
test("article CRUD, drafts, schedules, search, pagination and category protection", async () => {
  const base = (await user.get("/api/admin/articles")).body[0];
  const { id, revision, ...body } = base;
  body.slug = "test-draft";
  body.status = "draft";
  body.title = { th: "ทดสอบข่าวเฉพาะ", en: "Unique searchable news" };
  let r = await send("post", "/api/admin/articles", body);
  assert.equal(r.status, 201);
  const a = r.body;
  assert.equal((await user.get("/api/articles/test-draft")).status, 404);
  r = await send("patch", "/api/admin/articles/" + a.id, {
    revision: 1,
    patch: { status: "published", publishedAt: "2099-01-01T00:00:00.000Z" },
  });
  assert.equal(r.status, 200);
  assert.equal((await user.get("/api/articles/test-draft")).status, 404);
  r = await send("patch", "/api/admin/articles/" + a.id, {
    revision: 2,
    patch: { publishedAt: "2025-01-01T00:00:00.000Z" },
  });
  assert.equal(r.status, 200);
  assert.equal(
    (await user.get("/api/articles?lang=en&q=Unique")).body.total,
    1,
  );
  assert.equal((await user.get("/api/articles/test-draft")).status, 200);
  const d = (await user.get("/api/admin/documents")).body.news;
  assert.equal(
    (
      await send("patch", "/api/admin/documents/news", {
        revision: d.revision,
        patch: { pageSize: 1 },
      })
    ).status,
    200,
  );
  assert.equal((await user.get("/api/articles?page=2")).body.items.length, 1);
  assert.equal(
    (await send("delete", "/api/admin/articles/" + a.id, { revision: 2 }))
      .status,
    409,
  );
  assert.equal(
    (await send("delete", "/api/admin/articles/" + a.id, { revision: 3 }))
      .status,
    200,
  );
});
test("SVG server sanitization strips executable and external content", async () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert(1)"><script>alert(1)</script><foreignObject>bad</foreignObject><image href="https://attacker.test/x"/><path fill="url(https://attacker.test/x)" d="M0 0h20v20z"/></svg>';
  const r = await user
    .post("/api/admin/media")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf)
    .field("source", "test")
    .field("license", "test")
    .attach("file", Buffer.from(svg), {
      filename: "bad.svg",
      contentType: "image/svg+xml",
    });
  assert.equal(r.status, 201);
  const data = readFileSync(path.join(directory, "uploads", r.body.id), "utf8");
  assert.doesNotMatch(data, /script|onload|foreignObject|attacker|url\(/);
  assert.match(data, /<path/);
  const response = await user.get(r.body.url);
  assert.match(response.headers["content-security-policy"], /sandbox/);
});
test("real raster decoding, upload limits and MIME spoof rejection", async () => {
  const png = await sharp({
    create: { width: 3, height: 3, channels: 3, background: "#ffbd35" },
  })
    .png()
    .toBuffer();
  const good = await user
    .post("/api/admin/media")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf)
    .attach("file", png, { filename: "logo.png", contentType: "image/png" });
  assert.equal(good.status, 201);
  assert.equal(good.body.mime, "image/webp");
  const bad = await user
    .post("/api/admin/media")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf)
    .attach("file", Buffer.from("<html>fake</html>"), {
      filename: "fake.png",
      contentType: "image/png",
    });
  assert.ok(bad.status >= 400);
});
test("contact consent, inbox and email status are separate; newsletter deduplicates", async () => {
  const b = {
    name: "Test Person",
    email: "test@example.test",
    message: "A valid enquiry",
    consent: true,
  };
  assert.equal(
    (await send("post", "/api/contact", { ...b, consent: false })).status,
    400,
  );
  const r = await send("post", "/api/contact", b);
  assert.equal(r.status, 201);
  assert.equal(r.body.saved, true);
  assert.equal(r.body.mailStatus, "not_configured");
  const inbox = (await user.get("/api/admin/contacts")).body;
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].value.email, b.email);
  assert.equal(
    (await send("post", "/api/subscribe", { email: b.email, consent: true }))
      .status,
    201,
  );
  await send("post", "/api/subscribe", { email: b.email, consent: true });
  assert.equal((await user.get("/api/admin/subscribers")).body.length, 1);
});
test("backup/restore includes uploads, detects tampering, keeps sessions out", async () => {
  const backupDir = path.join(root, "backup"),
    restoredDir = path.join(root, "restored");
  await createBackup(directory, backupDir);
  restoreBackup(backupDir, restoredDir);
  const restored = createApp({ directory: restoredDir, origin });
  assert.equal(
    restored.db.prepare("SELECT count(*) n FROM contacts").get().n,
    1,
  );
  assert.equal(
    restored.db.prepare("SELECT count(*) n FROM sessions").get().n,
    0,
  );
  const media = restored.db.prepare("SELECT id FROM media").all();
  assert.equal(media.length, 2);
  for (const m of media)
    assert.ok(existsSync(path.join(restoredDir, "uploads", m.id)));
  restored.db.close();
  writeFileSync(path.join(backupDir, "site.sqlite"), "tampered");
  assert.throws(
    () => restoreBackup(backupDir, path.join(root, "bad-restore")),
    /Checksum/,
  );
});
test("restart and migrations preserve content, contacts, media, session and hashes", async () => {
  db.close();
  const reopened = createApp({ directory, origin });
  db = reopened.db;
  app = reopened.app;
  assert.equal(db.prepare("SELECT count(*) n FROM migrations").get().n, 1);
  assert.equal(db.prepare("SELECT count(*) n FROM contacts").get().n, 1);
  assert.equal(
    JSON.parse(
      db.prepare("SELECT value FROM documents WHERE key='home'").get().value,
    ).intro.th,
    "แก้ไขสำเร็จ",
  );
  assert.notEqual(
    db.prepare("SELECT password FROM users").get().password,
    password,
  );
  assert.ok(db.prepare("SELECT count(*) n FROM sessions").get().n > 0);
});
test("login throttling produces 429", async () => {
  const agent = request.agent(app);
  const token = (await agent.get("/api/session")).body.csrf;
  let r;
  for (let i = 0; i < 11; i++)
    r = await agent
      .post("/api/login")
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .send({ email: "missing@example.test", password: "invalid" });
  assert.equal(r.status, 429);
});

test("partial arrays retain future item fields; password change revokes other sessions", async () => {
  const d = path.join(root, "password-test");
  const isolated = createApp({ directory: d, origin, limits: false });
  const p = randomBytes(24).toString("hex"),
    next = randomBytes(24).toString("hex");
  isolated.db
    .prepare("INSERT INTO users(email,password) VALUES(?,?)")
    .run("change@example.test", await hashPassword(p));
  const a = request.agent(isolated.app),
    b = request.agent(isolated.app);
  async function login(agent, password) {
    let t = (await agent.get("/api/session")).body.csrf;
    const r = await agent
      .post("/api/login")
      .set("Origin", origin)
      .set("X-CSRF-Token", t)
      .send({ email: "change@example.test", password });
    return r;
  }
  let at = (await login(a, p)).body.csrf;
  await login(b, p);
  let doc = (await a.get("/api/admin/documents")).body.home;
  let r = await a
    .patch("/api/admin/documents/home")
    .set("Origin", origin)
    .set("X-CSRF-Token", at)
    .send({
      revision: doc.revision,
      patch: { cards: [{ future: "preserved" }] },
    });
  assert.equal(r.status, 200);
  r = await a
    .patch("/api/admin/documents/home")
    .set("Origin", origin)
    .set("X-CSRF-Token", at)
    .send({
      revision: r.body.revision,
      patch: { cards: [{ title: { th: "ใหม่" } }] },
    });
  assert.equal(r.body.value.cards[0].future, "preserved");
  r = await a
    .post("/api/password")
    .set("Origin", origin)
    .set("X-CSRF-Token", at)
    .send({ current: p, password: next });
  assert.equal(r.status, 200);
  assert.equal((await b.get("/api/admin/documents")).status, 401);
  assert.equal((await login(a, p)).status, 401);
  r = await login(a, next);
  assert.equal(r.status, 200);
  at = r.body.csrf;
  assert.equal(
    (await a.post("/api/logout").set("Origin", origin).set("X-CSRF-Token", at))
      .status,
    200,
  );
  assert.equal((await a.get("/api/admin/documents")).status, 401);
  isolated.db.close();
});
