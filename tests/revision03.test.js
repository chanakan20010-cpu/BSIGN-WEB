import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";

const origin = "http://localhost:3000";
async function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), "bsign-revision-03-"));
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
  const base = (await owner.get("/api/admin/articles")).body[0];
  const { id, revision, slug, ...content } = base;
  return {
    article: {
      ...content,
      status: "published",
      publishedAt: "2020-01-01T00:00:00.000Z",
    },
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
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("missing or blank article links generate unique readable links, including Thai-only titles", async () => {
  const f = await fixture();
  try {
    const input = {
      ...f.article,
      title: { th: "ข่าวสารระบบคลาวด์", en: "Cloud & AI Update!" },
    };
    const first = await f.send("post", "/api/admin/articles", input);
    assert.equal(first.status, 201);
    assert.equal(first.body.slug, "cloud-ai-update");
    for (const [index, value] of ["", "   ", "---"].entries()) {
      const response = await f.send("post", "/api/admin/articles", {
        ...input,
        slug: value,
      });
      assert.equal(response.status, 201);
      assert.equal(response.body.slug, "cloud-ai-update-" + (index + 2));
    }
    const thai = await f.send("post", "/api/admin/articles", {
      ...input,
      title: { th: "ข่าวประชาสัมพันธ์", en: "" },
      slug: " ",
    });
    assert.equal(thai.status, 201);
    assert.match(thai.body.slug, /^article-[a-f0-9]{12}$/);
    const longTitle = "a".repeat(200);
    const longOne = await f.send("post", "/api/admin/articles", {
      ...input,
      title: { th: longTitle, en: longTitle },
    });
    const longTwo = await f.send("post", "/api/admin/articles", {
      ...input,
      title: { th: longTitle, en: longTitle },
    });
    assert.equal(longOne.status, 201);
    assert.equal(longTwo.status, 201);
    assert.equal(longOne.body.slug.length, 150);
    assert.ok(longTwo.body.slug.length <= 150);
    assert.notEqual(longOne.body.slug, longTwo.body.slug);
    assert.equal(
      (await request(f.app).get("/api/articles/" + thai.body.slug)).body.id,
      thai.body.id,
    );
  } finally {
    f.close();
  }
});

test("custom links remain validated and blank edits keep published URLs and newer article data", async () => {
  const f = await fixture();
  try {
    const created = await f.send("post", "/api/admin/articles", {
      ...f.article,
      slug: "custom-release",
      title: {
        th: "ข่าวบริษัท",
        en: "Company news",
        format: { style: "heading", align: "center" },
      },
      nextReleaseMetadata: { enabled: true },
    });
    assert.equal(created.status, 201);
    const duplicate = await f.send("post", "/api/admin/articles", {
      ...f.article,
      slug: "custom-release",
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error, "DUPLICATE_SLUG");
    for (const slug of ["invalid/path", "INVALID", null, 4]) {
      const invalid = await f.send("post", "/api/admin/articles", {
        ...f.article,
        slug,
      });
      assert.equal(invalid.status, 400);
    }
    let article = created.body;
    for (const patch of [
      { title: { th: "แก้ชื่อข่าว" } },
      { slug: "" },
      { slug: "   " },
      { slug: "---" },
    ]) {
      const saved = await f.send("patch", "/api/admin/articles/" + article.id, {
        revision: article.revision,
        patch,
      });
      assert.equal(saved.status, 200);
      article = saved.body;
      assert.equal(article.slug, "custom-release");
      assert.deepEqual(article.title.format, {
        style: "heading",
        align: "center",
      });
      assert.deepEqual(article.nextReleaseMetadata, { enabled: true });
      assert.deepEqual(article.gallery, created.body.gallery);
    }
    assert.equal(
      (await request(f.app).get("/api/articles/custom-release")).body.id,
      article.id,
    );
    await f.restart();
    const persisted = (await f.owner.get("/api/admin/articles")).body.find(
      (value) => value.id === article.id,
    );
    assert.deepEqual(persisted, article);
    assert.equal(
      (await request(f.app).get("/api/articles/custom-release")).status,
      200,
    );
  } finally {
    f.close();
  }
});

test("older published hyphen links are preserved and generated links survive restart", async () => {
  const f = await fixture();
  try {
    const generated = await f.send("post", "/api/admin/articles", {
      ...f.article,
      title: { th: "บทความทดสอบ", en: "Persistent generated article" },
    });
    assert.equal(generated.status, 201);
    const legacy = (await f.owner.get("/api/admin/articles")).body.find(
      (value) => value.id !== generated.body.id,
    );
    const { id, revision, ...stored } = legacy;
    stored.slug = "-";
    f.db
      .prepare("UPDATE articles SET value=? WHERE id=?")
      .run(JSON.stringify(stored), id);
    const saved = await f.send("patch", "/api/admin/articles/" + id, {
      revision,
      patch: { slug: "", excerpt: { th: "คำโปรยที่แก้ไขใหม่" } },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.slug, "-");
    await f.restart();
    const response = await request(f.app).get(
      "/api/articles/" + generated.body.slug,
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.id, generated.body.id);
    const all = (await f.owner.get("/api/admin/articles")).body;
    assert.equal(all.find((value) => value.id === id).slug, "-");
  } finally {
    f.close();
  }
});

test("an explicit latest-article limit is independent of news pagination and orders equal dates by newest insertion", async () => {
  const f = await fixture();
  try {
    f.db.prepare("DELETE FROM articles").run();
    const news = (await f.owner.get("/api/admin/documents")).body.news;
    const setting = await f.send("patch", "/api/admin/documents/news", {
      revision: news.revision,
      patch: { pageSize: 1 },
    });
    assert.equal(setting.status, 200);
    const categories = news.value.categories.map((category) => category.id);
    const created = [];
    for (let index = 0; index < 4; index++) {
      const response = await f.send("post", "/api/admin/articles", {
        ...f.article,
        slug: "latest-story-" + index,
        category: categories[index % categories.length],
        publishedAt:
          index === 0 ? "2019-01-01T00:00:00.000Z" : "2020-01-01T00:00:00.000Z",
      });
      assert.equal(response.status, 201);
      created.push(response.body);
    }
    for (const [status, publishedAt] of [
      ["draft", "2021-01-01T00:00:00.000Z"],
      ["published", "2099-01-01T00:00:00.000Z"],
    ]) {
      const response = await f.send("post", "/api/admin/articles", {
        ...f.article,
        status,
        publishedAt,
      });
      assert.equal(response.status, 201);
    }
    const normal = await request(f.app).get("/api/articles");
    assert.equal(normal.status, 200);
    assert.equal(normal.body.items.length, 1);
    assert.equal(normal.body.total, 4);
    const latest = await request(f.app).get("/api/articles?limit=3");
    assert.equal(latest.status, 200);
    assert.deepEqual(
      latest.body.items.map((article) => article.id),
      created
        .slice(1)
        .reverse()
        .map((article) => article.id),
    );
    assert.equal(
      new Set(latest.body.items.map((article) => article.category)).size,
      Math.min(3, categories.length),
    );
    for (const limit of ["0", "-1", "31", "1.5", "bad", ""]) {
      assert.equal(
        (await request(f.app).get("/api/articles?limit=" + limit)).status,
        400,
      );
    }
    const filtered = await request(f.app).get(
      "/api/articles?limit=3&category=" + categories[0],
    );
    assert.equal(filtered.status, 200);
    assert.ok(
      filtered.body.items.every(
        (article) => article.category === categories[0],
      ),
    );
  } finally {
    f.close();
  }
});
