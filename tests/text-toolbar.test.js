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
import { inheritedTextFormat, textFormatting } from "../src/text-format.js";

const origin = "http://localhost:3000";
const format = {
  style: "intro",
  align: "center",
  font: "Noto Serif Thai",
  size: 24,
  weight: 700,
  italic: true,
  underline: true,
  strike: true,
  color: "#123456",
  background: "#fff2a8",
  line: 1.7,
  spacing: 0.8,
};
async function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "bsign-toolbar-"));
  const directory = path.join(root, "data");
  let runtime = createApp({ directory, origin, limits: false });
  const password = randomBytes(24).toString("hex");
  runtime.db
    .prepare("INSERT INTO users(email,password) VALUES(?,?)")
    .run("toolbar-owner@example.test", await hashPassword(password));
  let owner, csrf;
  async function login() {
    owner = request.agent(runtime.app);
    const token = (await owner.get("/api/session")).body.csrf;
    const result = await owner
      .post("/api/login")
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .send({ email: "toolbar-owner@example.test", password });
    assert.equal(result.status, 200);
    csrf = result.body.csrf;
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
    uploadFont() {
      return owner
        .post("/api/admin/fonts")
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf)
        .attach(
          "file",
          readFileSync(
            new URL(
              "../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2",
              import.meta.url,
            ),
          ),
          "toolbar.woff2",
        );
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

test("toolbar formatting renders safe font, sizing and decorations while clear restores inherited roles", () => {
  const styled = textFormatting({ format });
  assert.equal(styled.style.fontFamily, '"Noto Serif Thai", sans-serif');
  assert.equal(styled.style.fontSize, "24px");
  assert.equal(styled.style.fontWeight, 700);
  assert.equal(styled.style.fontStyle, "italic");
  assert.equal(styled.style.textDecorationLine, "underline line-through");
  assert.equal(styled.style.backgroundColor, "#fff2a8");
  assert.equal(styled.style.lineHeight, 1.7);
  assert.equal(styled.style.letterSpacing, "0.8px");
  const cleared = textFormatting({ format: inheritedTextFormat });
  assert.deepEqual(cleared.style, {});
  const theme = textFormatting({
    format: {
      style: "heading",
      size: "inherit",
      font: "inherit",
      underline: false,
      italic: false,
    },
  });
  assert.equal(theme.style.fontSize, "var(--bs-format-active-size)");
  assert.equal(theme.style.fontFamily, "var(--heading-font), sans-serif");
  assert.equal(theme.style.fontStyle, "normal");
  assert.equal(theme.style.textDecorationLine, "none");
  for (const bad of [
    { font: "Arial; color:red", size: "20px", weight: "bold" },
    {
      font: "var(--font)",
      italic: "italic",
      background: "url(https://example.test)",
    },
    { size: -3, line: Infinity, spacing: NaN },
  ]) {
    const result = textFormatting({ format: bad }).style;
    for (const key of [
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "backgroundColor",
      "lineHeight",
      "letterSpacing",
    ])
      assert.equal(result[key], undefined);
  }
});

test("toolbar fields preserve bilingual drafts, older partial writes and explicit clear sentinels", async () => {
  const f = await fixture();
  try {
    const original = await f.documents();
    const saved = await f.patch("home", {
      intro: { format: { ...format, futureToolbarHint: "preserve" } },
    });
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.body.value.intro.format, {
      ...format,
      futureToolbarHint: "preserve",
    });
    const partial = await f.patch("home", {
      intro: { th: "แก้ไขข้อความเพียงภาษาไทย" },
    });
    assert.equal(partial.status, 200);
    assert.equal(partial.body.value.intro.en, original.home.value.intro.en);
    assert.deepEqual(
      partial.body.value.intro.format,
      saved.body.value.intro.format,
    );
    const reset = await f.patch("home", {
      intro: { format: inheritedTextFormat },
    });
    assert.equal(reset.status, 200);
    assert.deepEqual(reset.body.value.intro.format, {
      ...inheritedTextFormat,
      futureToolbarHint: "preserve",
    });
    assert.deepEqual((await f.documents()).styles, original.styles);
    await f.restart();
    assert.deepEqual(
      (await f.documents()).home.value.intro,
      reset.body.value.intro,
    );
  } finally {
    f.close();
  }
});

test("toolbar API requires auth and rejects unapproved CSS, invalid ranges and missing custom fonts", async () => {
  const f = await fixture();
  try {
    const docs = await f.documents();
    assert.equal(
      (
        await request(f.app)
          .patch("/api/admin/documents/home")
          .send({ revision: docs.home.revision, patch: { intro: { format } } })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.owner
          .patch("/api/admin/documents/home")
          .send({ revision: docs.home.revision, patch: { intro: { format } } })
      ).status,
      403,
    );
    const invalid = [
      { font: "Arial" },
      { font: "var(--body-font)" },
      { size: "24px" },
      { size: 101 },
      { weight: 350 },
      { weight: 1000 },
      { italic: "true" },
      { underline: "url(x)" },
      { strike: 1 },
      { background: "#fff" },
      { background: "red" },
      { background: "var(--body-color)" },
      { line: 0.9 },
      { spacing: 21 },
      { font: "BSIGN Custom 11111111-1111-1111-1111-111111111111" },
    ];
    for (const candidate of invalid)
      assert.equal(
        (await f.patch("home", { intro: { format: candidate } })).status,
        400,
      );
    assert.deepEqual((await f.documents()).home, docs.home);
    assert.equal(
      (await f.patch("icons", { shared: { mail: { background: "inherit" } } }))
        .status,
      400,
    );
    assert.equal(
      (await f.patch("global", { footerLogo: { background: "inherit" } }))
        .status,
      400,
    );
    assert.equal(
      (await f.patch("global", { footerLogo: { background: "#e3c577" } }))
        .status,
      200,
    );
    assert.equal(
      (await f.patch("global", { footerLogo: { background: "transparent" } }))
        .status,
      200,
    );
  } finally {
    f.close();
  }
});

test("uploaded fonts work in individual article fields and cannot be removed while referenced", async () => {
  const f = await fixture();
  try {
    const uploaded = await f.uploadFont();
    assert.equal(uploaded.status, 201);
    const family = uploaded.body.family;
    const saved = await f.patch("home", {
      intro: { format: { ...format, font: family } },
    });
    assert.equal(saved.status, 200);
    assert.equal(
      (await f.send("delete", "/api/admin/fonts/" + uploaded.body.id)).status,
      409,
    );
    const template = (await f.owner.get("/api/admin/articles")).body[0];
    delete template.id;
    delete template.revision;
    const created = await f.send("post", "/api/admin/articles", {
      ...template,
      slug: "toolbar-font",
      title: {
        th: "บทความรูปแบบข้อความ",
        en: "Toolbar font article",
        format: { ...format, font: family },
      },
    });
    assert.equal(created.status, 201);
    assert.equal(
      (await f.patch("home", { intro: { format: { font: "inherit" } } }))
        .status,
      200,
    );
    assert.equal(
      (await f.send("delete", "/api/admin/fonts/" + uploaded.body.id)).status,
      409,
    );
    const article = await f.send(
      "patch",
      "/api/admin/articles/" + created.body.id,
      {
        revision: created.body.revision,
        patch: { title: { format: { font: "inherit" } } },
      },
    );
    assert.equal(article.status, 200);
    assert.equal(article.body.title.format.weight, 700);
    assert.equal(article.body.title.format.underline, true);
    assert.equal(
      (await f.send("delete", "/api/admin/fonts/" + uploaded.body.id)).status,
      200,
    );
  } finally {
    f.close();
  }
});

test("toolbar formats and logo backgrounds survive backup restore with font bytes and configuration intact", async () => {
  const f = await fixture();
  try {
    const uploaded = await f.uploadFont();
    assert.equal(uploaded.status, 201);
    assert.equal(
      (
        await f.patch("contact", {
          subtitle: { format: { ...format, font: uploaded.body.family } },
        })
      ).status,
      200,
    );
    assert.equal(
      (await f.patch("global", { footerLogo: { background: "#203040" } }))
        .status,
      200,
    );
    const marker = path.join(f.directory, ".env");
    writeFileSync(marker, "PRESERVE_TOOLBAR_CONFIGURATION=yes");
    const saved = await f.documents();
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
      assert.deepEqual(content.contact, saved.contact.value);
      assert.deepEqual(content.global, saved.global.value);
      assert.deepEqual(content.styles, saved.styles.value);
      assert.deepEqual(
        readFileSync(path.join(restoredDirectory, uploaded.body.url.slice(1))),
        readFileSync(path.join(f.directory, uploaded.body.url.slice(1))),
      );
      assert.equal(
        (await request(restored.app).get("/api/admin/documents")).status,
        401,
      );
    } finally {
      restored.db.close();
    }
    assert.equal(
      readFileSync(marker, "utf8"),
      "PRESERVE_TOOLBAR_CONFIGURATION=yes",
    );
  } finally {
    f.close();
  }
});
