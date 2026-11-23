import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import { createBackup } from "../scripts/backup.js";
import { restoreBackup } from "../scripts/restore.js";
import { textFormatting, textFormatProps } from "../src/text-format.js";

const origin = "http://localhost:3000";
async function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "bsign-revision-05-"));
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
    get app() {
      return runtime.app;
    },
    get owner() {
      return owner;
    },
    documents() {
      return owner.get("/api/admin/documents").then((r) => r.body);
    },
    send(method, url, body) {
      return owner[method](url)
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf)
        .send(body);
    },
    async patch(key, patch) {
      const docs = await this.documents();
      return this.send("patch", "/api/admin/documents/" + key, {
        revision: docs[key].revision,
        patch,
      });
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

test("text color formatting accepts only full HEX overrides and retains inherited role styles", () => {
  const styled = textFormatting({
    format: { style: "intro", align: "center", color: "#A123bC" },
  });
  assert.equal(styled.color, "#A123bC");
  assert.equal(styled.style.color, "#A123bC");
  assert.equal(styled.style.fontSize, "var(--bs-format-active-size)");
  assert.equal(styled.style.textAlign, "center");
  assert.equal(
    textFormatProps({ format: { color: "#123456" } })["data-text-color"],
    "custom",
  );
  const inherited = textFormatting({
    format: { style: "intro", color: "inherit" },
  });
  assert.equal(inherited.color, null);
  assert.equal(inherited.style.color, "var(--intro-color)");
  for (const color of [
    undefined,
    null,
    "",
    "#123",
    "red",
    "transparent",
    "rgb(0,0,0)",
    "var(--body-color)",
    "url(https://example.test/x)",
    "#123456;position:absolute",
    { color: "#123456" },
  ]) {
    assert.equal(textFormatting({ format: { color } }).color, null);
    assert.equal(textFormatting({ format: { color } }).style.color, undefined);
    assert.equal(
      textFormatProps({ format: { color } })["data-text-color"],
      undefined,
    );
  }
});

test("local text colors save on each page without changing shared styles or unrelated content", async () => {
  const f = await fixture();
  try {
    const original = await f.documents();
    for (const [key, patch] of [
      ["global", { brand: { format: { color: "#123456" } } }],
      ["home", { intro: { format: { color: "#234567" } } }],
      ["about", { intro: { format: { color: "#345678" } } }],
      [
        "news",
        {
          title: [
            { text: { format: { color: "#456789" } } },
            ...original.news.value.title.slice(1),
          ],
        },
      ],
      [
        "contact",
        {
          title: [{ text: { format: { color: "#567890" } } }],
          subtitle: { format: { color: "#678901" } },
        },
      ],
    ]) {
      const saved = await f.patch(key, patch);
      assert.equal(saved.status, 200, key);
    }
    const docs = await f.documents();
    assert.deepEqual(docs.styles, original.styles);
    assert.deepEqual(docs.global.value.company, original.global.value.company);
    assert.deepEqual(docs.home.value.cards, original.home.value.cards);
    assert.equal(docs.global.value.brand.format.color, "#123456");
    assert.equal(docs.home.value.intro.format.color, "#234567");
    assert.equal(docs.about.value.intro.format.color, "#345678");
    assert.equal(docs.news.value.title[0].text.format.color, "#456789");
    assert.equal(docs.contact.value.title[0].text.format.color, "#567890");
    assert.equal(docs.contact.value.subtitle.format.color, "#678901");
    for (const key of ["global", "home", "about", "news", "contact"])
      assert.equal(
        JSON.stringify((await request(f.app).get("/api/content")).body[key]),
        JSON.stringify(docs[key].value),
      );
  } finally {
    f.close();
  }
});

test("local colors require authorized updates and reject CSS while legacy color fields stay strict", async () => {
  const f = await fixture();
  try {
    const docs = await f.documents();
    const anonymous = request.agent(f.app);
    const token = (await anonymous.get("/api/session")).body.csrf;
    assert.equal(
      (
        await anonymous
          .patch("/api/admin/documents/home")
          .set("Origin", origin)
          .set("X-CSRF-Token", token)
          .send({
            revision: docs.home.revision,
            patch: { intro: { format: { color: "#123456" } } },
          })
      ).status,
      401,
    );
    assert.equal(
      (
        await f.owner.patch("/api/admin/documents/home").send({
          revision: docs.home.revision,
          patch: { intro: { format: { color: "#123456" } } },
        })
      ).status,
      403,
    );
    for (const color of [
      "",
      "#abc",
      "#12345678",
      "red",
      "transparent",
      "var(--hero-color)",
      "rgb(1,2,3)",
      "url(https://example.test/x)",
      "#123456;color:red",
      "inherit;color:red",
      null,
      123456,
      {},
    ]) {
      assert.equal(
        (await f.patch("home", { intro: { format: { color } } })).status,
        400,
      );
    }
    for (const [key, patch] of [
      ["styles", { body: { color: "inherit" } }],
      ["home", { title: [{ color: "inherit" }] }],
      ["icons", { shared: { arrow: { color: "inherit" } } }],
    ])
      assert.equal((await f.patch(key, patch)).status, 400);
    assert.deepEqual(await f.documents(), docs);
  } finally {
    f.close();
  }
});

test("explicit color resets survive partial clients and article colors keep both languages and paragraph content", async () => {
  const f = await fixture();
  try {
    const saved = await f.patch("home", {
      intro: {
        format: {
          style: "intro",
          align: "right",
          color: "#123456",
          futureFlag: true,
        },
      },
    });
    assert.equal(saved.status, 200);
    const oldClient = await f.patch("home", {
      intro: { th: "เปลี่ยนเฉพาะเนื้อหา" },
    });
    assert.equal(oldClient.status, 200);
    assert.deepEqual(
      oldClient.body.value.intro.format,
      saved.body.value.intro.format,
    );
    const reset = await f.patch("home", {
      intro: { format: { color: "inherit" } },
    });
    assert.equal(reset.status, 200);
    assert.deepEqual(reset.body.value.intro.format, {
      style: "intro",
      align: "right",
      color: "inherit",
      futureFlag: true,
    });
    const titleLine = (await f.documents()).contact.value.title[0];
    const localTitle = await f.patch("contact", {
      title: [{ text: { format: { color: "#2468ac" } } }],
    });
    assert.equal(localTitle.status, 200);
    const resetTitle = await f.patch("contact", {
      title: [{ text: { format: { color: "inherit" } } }],
    });
    assert.equal(resetTitle.status, 200);
    assert.equal(resetTitle.body.value.title[0].color, titleLine.color);
    const base = (await f.owner.get("/api/admin/articles")).body[0];
    const { id, revision, ...article } = base;
    const created = await f.send("post", "/api/admin/articles", {
      ...article,
      slug: "local-color-story",
      status: "published",
      publishedAt: "2020-01-01T00:00:00.000Z",
      title: {
        th: "บทความสีเฉพาะ",
        en: "Locally colored story",
        format: { color: "#123456" },
      },
      excerpt: {
        th: "คำโปรย",
        en: "Introduction",
        format: { color: "#234567", style: "intro" },
      },
      blocks: [
        {
          id: "paragraph-one",
          text: {
            th: "เนื้อหาภาษาไทย",
            en: "English paragraph",
            format: { color: "#345678", style: "body", align: "justify" },
          },
          image: null,
          align: "left",
          ratio: "original",
        },
      ],
    });
    assert.equal(created.status, 201);
    const updated = await f.send(
      "patch",
      "/api/admin/articles/" + created.body.id,
      {
        revision: created.body.revision,
        patch: {
          title: { th: "ชื่อใหม่" },
          blocks: [{ id: "paragraph-one", text: { th: "เนื้อหาใหม่" } }],
        },
      },
    );
    assert.equal(updated.status, 200);
    assert.equal(updated.body.title.en, "Locally colored story");
    assert.equal(updated.body.blocks[0].text.en, "English paragraph");
    assert.deepEqual(updated.body.title.format, created.body.title.format);
    assert.deepEqual(updated.body.excerpt.format, created.body.excerpt.format);
    assert.deepEqual(
      updated.body.blocks[0].text.format,
      created.body.blocks[0].text.format,
    );
    assert.deepEqual(
      (await request(f.app).get("/api/articles/local-color-story")).body.title
        .format,
      created.body.title.format,
    );
  } finally {
    f.close();
  }
});

test("local text colors and resets persist after restart and backup restore without changing configuration", async () => {
  const f = await fixture();
  try {
    const original = await f.documents();
    const marker = path.join(f.directory, ".env");
    writeFileSync(marker, "PRESERVE_CONFIGURATION=revision05-fixture");
    assert.equal(
      (await f.patch("global", { brand: { format: { color: "#123456" } } }))
        .status,
      200,
    );
    assert.equal(
      (
        await f.patch("home", {
          intro: { format: { color: "inherit", style: "intro" } },
        })
      ).status,
      200,
    );
    assert.equal(
      (await f.patch("contact", { subtitle: { format: { color: "#654321" } } }))
        .status,
      200,
    );
    const saved = await f.documents();
    await f.restart();
    assert.deepEqual(await f.documents(), saved);
    const backup = path.join(f.root, "backup"),
      target = path.join(f.root, "restored");
    await createBackup(f.directory, backup);
    restoreBackup(backup, target);
    const restored = createApp({ directory: target, origin, limits: false });
    try {
      const content = (await request(restored.app).get("/api/content")).body;
      for (const key of ["global", "home", "contact"])
        assert.deepEqual(content[key], saved[key].value);
      assert.deepEqual(content.styles, original.styles.value);
    } finally {
      restored.db.close();
    }
    assert.equal(
      readFileSync(marker, "utf8"),
      "PRESERVE_CONFIGURATION=revision05-fixture",
    );
  } finally {
    f.close();
  }
});
