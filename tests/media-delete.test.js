import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import { deleteMedia } from "../server/media-library.js";

const origin = "http://localhost:3000";
const svg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#126745"/></svg>',
);
async function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "bsign-media-delete-"));
  const directory = path.join(root, "data");
  let runtime = createApp({ directory, origin, limits: false });
  const password = randomBytes(24).toString("hex");
  runtime.db
    .prepare("INSERT INTO users(email,password) VALUES(?,?)")
    .run("media-owner@example.test", await hashPassword(password));
  let owner, csrf;
  async function login() {
    owner = request.agent(runtime.app);
    const token = (await owner.get("/api/session")).body.csrf;
    const response = await owner
      .post("/api/login")
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .send({ email: "media-owner@example.test", password });
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
    get db() {
      return runtime.db;
    },
    get owner() {
      return owner;
    },
    async upload(name = "fixture.svg") {
      const response = await owner
        .post("/api/admin/media")
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf)
        .attach("file", svg, { filename: name, contentType: "image/svg+xml" });
      assert.equal(response.status, 201);
      return response.body;
    },
    remove(id) {
      return owner
        .delete("/api/admin/media/" + encodeURIComponent(id))
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf);
    },
    list() {
      return owner.get("/api/admin/media");
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

test("media deletion requires authentication, correct origin and CSRF without changing files", async () => {
  const f = await fixture();
  try {
    const media = await f.upload();
    const anonymous = request.agent(f.app);
    const csrf = (await anonymous.get("/api/session")).body.csrf;
    assert.equal((await anonymous.get("/api/admin/media")).status, 401);
    assert.equal(
      (
        await anonymous
          .delete("/api/admin/media/" + media.id)
          .set("Origin", origin)
          .set("X-CSRF-Token", csrf)
      ).status,
      401,
    );
    assert.equal(
      (await f.owner.delete("/api/admin/media/" + media.id)).status,
      403,
    );
    assert.equal(
      (
        await f.owner
          .delete("/api/admin/media/" + media.id)
          .set("Origin", "https://outside.example.test")
      ).status,
      403,
    );
    assert.equal(existsSync(path.join(f.directory, media.url)), true);
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM media WHERE id=?").get(media.id).n,
      1,
    );
  } finally {
    f.close();
  }
});

test("unused media deletion removes only its file and metadata, is audited and persists after restart", async () => {
  const f = await fixture();
  try {
    const target = await f.upload("same-name.svg");
    const keep = await f.upload("same-name.svg");
    const keepBytes = readFileSync(path.join(f.directory, keep.url));
    const documents = f.db
      .prepare("SELECT * FROM documents ORDER BY key")
      .all();
    const privateFile = path.join(f.directory, ".env");
    writeFileSync(privateFile, "PRESERVE_CONFIGURATION=fixture");
    const rows = (await f.list()).body;
    assert.equal(rows.length, 2);
    assert.equal(rows.find(({ id }) => id === target.id).inUse, false);
    assert.deepEqual(rows.find(({ id }) => id === target.id).references, []);
    assert.equal((await f.remove(target.id)).status, 200);
    assert.equal(existsSync(path.join(f.directory, target.url)), false);
    assert.equal((await request(f.app).get(target.url)).status, 404);
    assert.deepEqual(readFileSync(path.join(f.directory, keep.url)), keepBytes);
    assert.equal(
      readFileSync(privateFile, "utf8"),
      "PRESERVE_CONFIGURATION=fixture",
    );
    assert.deepEqual(
      f.db.prepare("SELECT * FROM documents ORDER BY key").all(),
      documents,
    );
    assert.equal(f.db.prepare("SELECT count(*) n FROM users").get().n, 1);
    assert.equal(
      f.db
        .prepare("SELECT count(*) n FROM audit WHERE action='media:delete'")
        .get().n,
      1,
    );
    assert.equal((await f.remove(target.id)).status, 404);
    await f.restart();
    assert.deepEqual(
      (await f.list()).body.map(({ id }) => id),
      [keep.id],
    );
    assert.equal((await request(f.app).get(keep.url)).status, 200);
    assert.equal((await request(f.app).get(target.url)).status, 404);
  } finally {
    f.close();
  }
});

test("saved logo, favicon, future icon and draft-article references protect images and expose locations only", async () => {
  const f = await fixture();
  try {
    const media = await f.upload();
    const originalGlobal = f.db
      .prepare("SELECT value FROM documents WHERE key='global'")
      .get().value;
    const originalHome = f.db
      .prepare("SELECT value FROM documents WHERE key='home'")
      .get().value;
    const global = JSON.parse(originalGlobal),
      home = JSON.parse(originalHome);
    global.logo.url = media.url;
    global.favicon = media.url + "?v=2#icon";
    global.futurePrivateNote = "never-return-this-document-value";
    home.futureIcon = {
      asset: media.url.toUpperCase(),
      nested: {
        url: media.url.replace(
          media.id[0],
          "%" + media.id.charCodeAt(0).toString(16),
        ),
      },
    };
    f.db
      .prepare("UPDATE documents SET value=? WHERE key='global'")
      .run(JSON.stringify(global));
    f.db
      .prepare("UPDATE documents SET value=? WHERE key='home'")
      .run(JSON.stringify(home));
    const articleId = randomUUID();
    f.db.prepare("INSERT INTO articles(id,value) VALUES(?,?)").run(
      articleId,
      JSON.stringify({
        title: { th: "บทความร่างที่ใช้ภาพ" },
        status: "draft",
        image: { url: media.url },
        gallery: [{ url: media.url }],
      }),
    );
    const item = (await f.list()).body.find(({ id }) => id === media.id);
    assert.equal(item.inUse, true);
    assert.ok(item.usageCount >= 5);
    assert.ok(
      item.references.some(
        ({ kind, key }) => kind === "document" && key === "global",
      ),
    );
    assert.ok(
      item.references.some(
        ({ kind, status }) => kind === "article" && status === "draft",
      ),
    );
    assert.equal(
      JSON.stringify(item).includes("never-return-this-document-value"),
      false,
    );
    assert.equal(JSON.stringify(item).includes("password"), false);
    const denied = await f.remove(media.id);
    assert.equal(denied.status, 409);
    assert.equal(denied.body.error, "MEDIA_IN_USE");
    assert.deepEqual(denied.body.references, item.references);
    assert.equal(existsSync(path.join(f.directory, media.url)), true);
    f.db
      .prepare("UPDATE documents SET value=? WHERE key='global'")
      .run(originalGlobal);
    f.db
      .prepare("UPDATE documents SET value=? WHERE key='home'")
      .run(originalHome);
    f.db.prepare("DELETE FROM articles WHERE id=?").run(articleId);
    assert.equal(
      (await f.list()).body.find(({ id }) => id === media.id).inUse,
      false,
    );
    assert.equal((await f.remove(media.id)).status, 200);
  } finally {
    f.close();
  }
});

test("missing physical images can be removed from the library without affecting other content", async () => {
  const f = await fixture();
  try {
    const media = await f.upload();
    rmSync(path.join(f.directory, media.url));
    const result = await f.remove(media.id);
    assert.equal(result.status, 200);
    assert.equal(result.body.alreadyMissing, true);
    assert.equal((await f.list()).body.length, 0);
  } finally {
    f.close();
  }
});

test("file removal and SQLite commit failures preserve the original image, metadata and usable connection", async () => {
  const f = await fixture();
  try {
    const media = await f.upload();
    const file = path.join(f.directory, media.url);
    const bytes = readFileSync(file);
    assert.throws(
      () =>
        deleteMedia(f.db, f.directory, media.id, {
          unlinkSync: () => {
            throw Object.assign(new Error("File locked"), { code: "EPERM" });
          },
        }),
      (error) => error.code === "MEDIA_DELETE_FAILED",
    );
    assert.deepEqual(readFileSync(file), bytes);
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM media WHERE id=?").get(media.id).n,
      1,
    );
    const failCommit = {
      prepare: (sql) => f.db.prepare(sql),
      exec: (sql) => {
        if (sql === "COMMIT") throw new Error("Commit failure fixture");
        return f.db.exec(sql);
      },
    };
    assert.throws(
      () => deleteMedia(failCommit, f.directory, media.id),
      (error) => error.code === "MEDIA_DELETE_FAILED",
    );
    assert.deepEqual(readFileSync(file), bytes);
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM media WHERE id=?").get(media.id).n,
      1,
    );
    assert.throws(
      () =>
        deleteMedia(f.db, f.directory, media.id, {
          onDelete: () => {
            throw new Error("Audit failure fixture");
          },
        }),
      (error) => error.code === "MEDIA_DELETE_FAILED",
    );
    assert.deepEqual(readFileSync(file), bytes);
    assert.equal((await f.remove(media.id)).status, 200);
  } finally {
    f.close();
  }
});

test("media identifiers and symlinked files cannot remove paths outside registered uploads", async () => {
  const f = await fixture();
  try {
    const outside = path.join(f.root, "preserve.png");
    writeFileSync(outside, "outside owner bytes");
    for (const id of [
      "../preserve.png",
      "..\\preserve.png",
      ".env",
      "C:\\private.png",
      "image.svg:stream",
    ])
      assert.throws(
        () => deleteMedia(f.db, f.directory, id),
        (error) => error.code === "INVALID_MEDIA_ID",
      );
    const media = await f.upload();
    const file = path.join(f.directory, media.url);
    rmSync(file);
    symlinkSync(outside, file, "file");
    const denied = await f.remove(media.id);
    assert.equal(denied.status, 500);
    assert.equal(denied.body.error, "MEDIA_FILE_UNSAFE");
    assert.equal(lstatSync(file).isSymbolicLink(), true);
    assert.equal(readFileSync(outside, "utf8"), "outside owner bytes");
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM media WHERE id=?").get(media.id).n,
      1,
    );
  } finally {
    f.close();
  }
});

test("unreadable saved-reference data fails closed before deleting an image", async () => {
  const f = await fixture();
  try {
    const media = await f.upload();
    f.db
      .prepare("INSERT INTO documents(key,value) VALUES(?,?)")
      .run("future-import", "malformed JSON fixture");
    const result = await f.remove(media.id);
    assert.equal(result.status, 500);
    assert.equal(result.body.error, "MEDIA_REFERENCES_UNAVAILABLE");
    assert.equal(existsSync(path.join(f.directory, media.url)), true);
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM media WHERE id=?").get(media.id).n,
      1,
    );
  } finally {
    f.close();
  }
});
