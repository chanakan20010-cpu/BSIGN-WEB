import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
  symlinkSync,
  readlinkSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import request from "supertest";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import {
  adminPresentationDefaults,
  renderAdminPresentationText,
} from "../server/admin-presentation-defaults.js";
import { requestedFonts } from "../src/font-catalog.js";
import {
  SOCIAL_PLATFORMS,
  createSocialChannel,
} from "../src/social-catalog.js";
import { createBackup } from "../scripts/backup.js";
import { restoreBackup } from "../scripts/restore.js";

const origin = "http://localhost:3000";
const fontBuffer = () =>
  readFileSync(
    new URL(
      "../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2",
      import.meta.url,
    ),
  );
async function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "bsign-revision-04-"));
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
    documents() {
      return owner.get("/api/admin/documents").then((r) => r.body);
    },
    send(method, url, body) {
      return owner[method](url)
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf)
        .send(body);
    },
    uploadFont() {
      return owner
        .post("/api/admin/fonts")
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf)
        .field("label", "Uploaded brand font")
        .field("license", "OFL-1.1")
        .attach("file", fontBuffer(), "brand.woff2");
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

test("login presentation edits require authentication, stay revision safe, and never expose account settings", async () => {
  const f = await fixture();
  try {
    const docs = await f.documents();
    const anonymous = request.agent(f.app);
    const token = (await anonymous.get("/api/session")).body.csrf;
    assert.equal(
      (
        await anonymous
          .patch("/api/admin/documents/adminPresentation")
          .set("Origin", origin)
          .set("X-CSRF-Token", token)
          .send({
            revision: docs.adminPresentation.revision,
            patch: { title: "Public login heading" },
          })
      ).status,
      401,
    );
    const saved = await f.send(
      "patch",
      "/api/admin/documents/adminPresentation",
      {
        revision: docs.adminPresentation.revision,
        patch: {
          title: "Public login heading",
          storyIntro: "Welcome to {brand}",
          helpInstructions: "Contact your website owner.",
        },
      },
    );
    assert.equal(saved.status, 200);
    assert.equal(
      (
        await f.send("patch", "/api/admin/documents/adminPresentation", {
          revision: docs.adminPresentation.revision,
          patch: { title: "stale" },
        })
      ).status,
      409,
    );
    for (const patch of [
      { password: "secret" },
      { accounts: [] },
      { sessionSecret: "secret" },
      { title: " " },
      { title: "x".repeat(5001) },
      { title: { th: "wrong type" } },
      { title: "control\u0000value" },
    ])
      assert.equal(
        (
          await f.send("patch", "/api/admin/documents/adminPresentation", {
            revision: saved.body.revision,
            patch,
          })
        ).status,
        400,
      );
    const usersBefore = f.db.prepare("SELECT * FROM users").all();
    // Simulate an old/imported document with private, unrecognized keys.
    f.db
      .prepare("UPDATE documents SET value=? WHERE key='adminPresentation'")
      .run(
        JSON.stringify({
          ...saved.body.value,
          password: "must-never-be-public",
          accounts: usersBefore,
        }),
      );
    for (const maintenance of [false, true]) {
      const state = (await f.documents()).maintenance;
      assert.equal(
        (
          await f.send("patch", "/api/admin/documents/maintenance", {
            revision: state.revision,
            patch: { enabled: maintenance },
          })
        ).status,
        200,
      );
      const content = (await request(f.app).get("/api/content")).body;
      assert.deepEqual(content.adminPresentation, saved.body.value);
      assert.deepEqual(
        Object.keys(content.adminPresentation).sort(),
        Object.keys(adminPresentationDefaults).sort(),
      );
      assert.deepEqual(content.global.logo, docs.global.value.logo);
      assert.deepEqual(content.global.company, docs.global.value.company);
      assert.equal(
        JSON.stringify(content).includes("must-never-be-public"),
        false,
      );
      if (maintenance) assert.equal(content.home, undefined);
    }
    assert.deepEqual(f.db.prepare("SELECT * FROM users").all(), usersBefore);
    assert.equal(
      renderAdminPresentationText(
        "{brand} / {companyEn} / {year}",
        { brand: { th: "My Brand" }, company: { en: "My Company" } },
        2026,
      ),
      "My Brand / My Company / 2026",
    );
  } finally {
    f.close();
  }
});

test("migration 5 fills only missing presentation fields and is stable across restarts", async () => {
  const f = await fixture();
  try {
    const docs = await f.documents();
    const home = structuredClone(docs.home.value),
      contact = structuredClone(docs.contact.value),
      icons = structuredClone(docs.icons.value);
    delete home.advantages[0].appearance;
    home.advantages[1].appearance = { background: "#123456" };
    home.advantages[2].appearance = {
      background: "transparent",
      border: "#654321",
    };
    home.advantages[0].title.format = { style: "panelHeading", align: "right" };
    home.futureSetting = { preserved: true };
    delete contact.socials[0].iconStyle;
    delete contact.socials[1].iconStyle;
    const customIcon = {
      ...icons.shared.line,
      color: "#102030",
      background: "#ffffff",
    };
    icons.overrides["social.0"] = customIcon;
    delete icons.overrides["social.1"];
    icons.shared.linkedin.color = "#405060";
    contact.socials[2].iconStyle.color = "#708090";
    const presentation = {
      title: "Keep my login heading",
      futureDisplay: "preserved internally",
    };
    for (const [key, value] of Object.entries({
      home,
      contact,
      icons,
      adminPresentation: presentation,
    }))
      f.db
        .prepare("UPDATE documents SET value=? WHERE key=?")
        .run(JSON.stringify(value), key);
    f.db.prepare("DELETE FROM migrations WHERE version=5").run();
    await f.restart();
    const migrated = await f.documents();
    assert.equal(
      f.db.prepare("SELECT count(*) n FROM migrations WHERE version=5").get().n,
      1,
    );
    assert.deepEqual(
      migrated.home.value.advantages.map((item) => item.appearance),
      [
        { background: "#f1f2f4", border: "transparent" },
        { background: "#123456", border: "transparent" },
        home.advantages[2].appearance,
      ],
    );
    assert.deepEqual(
      migrated.home.value.advantages[0].title.format,
      home.advantages[0].title.format,
    );
    assert.deepEqual(migrated.home.value.futureSetting, home.futureSetting);
    assert.deepEqual(migrated.contact.value.socials[0].iconStyle, customIcon);
    assert.deepEqual(
      migrated.contact.value.socials[1].iconStyle,
      icons.shared.linkedin,
    );
    assert.deepEqual(migrated.contact.value.socials[2], contact.socials[2]);
    assert.deepEqual(
      migrated.contact.value.socials.map((row) => row.icon),
      contact.socials.map((row) => row.icon),
    );
    assert.equal(migrated.adminPresentation.value.title, presentation.title);
    assert.equal(
      migrated.adminPresentation.value.futureDisplay,
      presentation.futureDisplay,
    );
    assert.equal(
      migrated.adminPresentation.value.submitLabel,
      adminPresentationDefaults.submitLabel,
    );
    for (const key of [
      "global",
      "styles",
      "about",
      "icons",
      "maintenance",
      "news",
    ])
      assert.deepEqual(
        migrated[key],
        key === "icons" ? { ...docs.icons, value: icons } : docs[key],
      );
    await f.restart();
    assert.deepEqual(await f.documents(), migrated);
  } finally {
    f.close();
  }
});

test("per-card colors and all social rows save safely, follow their rows, and survive older partial edits", async () => {
  const f = await fixture();
  try {
    const docs = await f.documents();
    const savedHome = await f.send("patch", "/api/admin/documents/home", {
      revision: docs.home.revision,
      patch: {
        advantages: [
          { appearance: { background: "#ddeeff", border: "#223344" } },
          ...docs.home.value.advantages.slice(1),
        ],
      },
    });
    assert.equal(savedHome.status, 200);
    for (const appearance of [
      { background: "red", border: "transparent" },
      { background: "#ffffff", border: "url(https://example.test)" },
      { background: "#ffffff", border: "transparent", position: "fixed" },
    ])
      assert.equal(
        (
          await f.send("patch", "/api/admin/documents/home", {
            revision: savedHome.body.revision,
            patch: {
              advantages: [
                { appearance },
                ...savedHome.body.value.advantages.slice(1),
              ],
            },
          })
        ).status,
        400,
      );
    const older = await f.send("patch", "/api/admin/documents/home", {
      revision: savedHome.body.revision,
      patch: {
        advantages: savedHome.body.value.advantages.map(
          ({ appearance, icon, ...row }) => row,
        ),
      },
    });
    assert.equal(older.status, 200);
    assert.deepEqual(
      older.body.value.advantages,
      savedHome.body.value.advantages,
    );
    const socials = SOCIAL_PLATFORMS.map(({ id }) => createSocialChannel(id));
    socials[0].iconStyle.color = "#123456";
    let savedContact = await f.send("patch", "/api/admin/documents/contact", {
      revision: docs.contact.revision,
      patch: { socials },
    });
    assert.equal(savedContact.status, 200);
    assert.equal(savedContact.body.value.socials.length, 20);
    const reordered = [
      ...savedContact.body.value.socials.slice(1),
      savedContact.body.value.socials[0],
    ];
    savedContact = await f.send("patch", "/api/admin/documents/contact", {
      revision: savedContact.body.revision,
      patch: { socials: reordered },
    });
    assert.equal(savedContact.status, 200);
    assert.equal(savedContact.body.value.socials.at(-1).platform, "facebook");
    assert.equal(
      savedContact.body.value.socials.at(-1).iconStyle.color,
      "#123456",
    );
    assert.equal(
      (
        await f.send("patch", "/api/admin/documents/contact", {
          revision: savedContact.body.revision,
          patch: {
            socials: [
              {
                ...reordered[0],
                iconStyle: {
                  ...reordered[0].iconStyle,
                  background: "position:absolute",
                },
              },
            ],
          },
        })
      ).status,
      400,
    );
    await f.restart();
    const restarted = await f.documents();
    assert.deepEqual(restarted.home, older.body);
    assert.deepEqual(restarted.contact, savedContact.body);
  } finally {
    f.close();
  }
});

test("built-in and uploaded font selections, presentation and assets survive restart and backup restore", async () => {
  const f = await fixture();
  try {
    assert.equal(requestedFonts.length, 20);
    let styles = (await f.documents()).styles;
    for (const { family } of requestedFonts) {
      const response = await f.send("patch", "/api/admin/documents/styles", {
        revision: styles.revision,
        patch: { body: { font: family } },
      });
      assert.equal(response.status, 200);
      styles = response.body;
    }
    for (const family of [
      "Unknown Font",
      "x; background:url(https://example.test)",
      "BSIGN Custom 11111111-1111-1111-1111-111111111111",
    ])
      assert.equal(
        (
          await f.send("patch", "/api/admin/documents/styles", {
            revision: styles.revision,
            patch: { body: { font: family } },
          })
        ).status,
        400,
      );
    const uploaded = await f.uploadFont();
    assert.equal(uploaded.status, 201);
    const selected = await f.send("patch", "/api/admin/documents/styles", {
      revision: styles.revision,
      patch: { body: { font: uploaded.body.family } },
    });
    assert.equal(selected.status, 200);
    assert.equal(
      (await f.send("delete", `/api/admin/fonts/${uploaded.body.id}`, {}))
        .status,
      409,
    );
    const docs = await f.documents();
    const presentation = await f.send(
      "patch",
      "/api/admin/documents/adminPresentation",
      {
        revision: docs.adminPresentation.revision,
        patch: { title: "Saved login title" },
      },
    );
    assert.equal(presentation.status, 200);
    const home = await f.send("patch", "/api/admin/documents/home", {
      revision: docs.home.revision,
      patch: {
        advantages: [
          { appearance: { background: "#ddeeff", border: "#123456" } },
          ...docs.home.value.advantages.slice(1),
        ],
      },
    });
    const contact = await f.send("patch", "/api/admin/documents/contact", {
      revision: docs.contact.revision,
      patch: {
        socials: [
          { iconStyle: { color: "#654321" } },
          ...docs.contact.value.socials.slice(1),
        ],
      },
    });
    assert.equal(home.status, 200);
    assert.equal(contact.status, 200);
    await f.restart();
    assert.deepEqual((await f.documents()).styles, selected.body);
    assert.equal((await request(f.app).get(uploaded.body.url)).status, 200);
    writeFileSync(
      path.join(f.directory, "fonts", "unregistered.woff2"),
      "not a registered font",
    );
    writeFileSync(
      path.join(f.directory, ".env"),
      "PRIVATE_VALUE=not-for-backup",
    );
    const backup = path.join(f.root, "backup"),
      restoredDirectory = path.join(f.root, "restored");
    await createBackup(f.directory, backup);
    assert.equal(existsSync(path.join(backup, ".env")), false);
    assert.equal(existsSync(path.join(backup, "session.key")), false);
    assert.equal(
      existsSync(path.join(backup, "fonts", "unregistered.woff2")),
      false,
    );
    restoreBackup(backup, restoredDirectory);
    const restored = createApp({
      directory: restoredDirectory,
      origin,
      limits: false,
    });
    try {
      const content = (await request(restored.app).get("/api/content")).body;
      assert.deepEqual(content.styles, selected.body.value);
      assert.deepEqual(content.adminPresentation, presentation.body.value);
      assert.deepEqual(content.home, home.body.value);
      assert.deepEqual(content.contact, contact.body.value);
      assert.deepEqual(
        (await request(restored.app).get("/api/fonts")).body.map(
          ({ family }) => family,
        ),
        [uploaded.body.family],
      );
      const fontFile = uploaded.body.url.slice(1);
      assert.deepEqual(
        readFileSync(path.join(restoredDirectory, fontFile)),
        fontBuffer(),
      );
      assert.equal(
        restored.db.prepare("SELECT count(*) n FROM sessions").get().n,
        0,
      );
      assert.equal(
        (await request(restored.app).get("/api/admin/fonts")).status,
        401,
      );
    } finally {
      restored.db.close();
    }
    assert.equal(
      readFileSync(path.join(f.directory, ".env"), "utf8"),
      "PRIVATE_VALUE=not-for-backup",
    );
  } finally {
    f.close();
  }
});

test("restore rejects mismatched registered fonts, path escapes, symlinks and oversized font files before creating a target", async () => {
  const f = await fixture();
  try {
    const uploaded = await f.uploadFont();
    assert.equal(uploaded.status, 201);
    const backup = path.join(f.root, "backup");
    await createBackup(f.directory, backup);
    const manifestFile = path.join(backup, "manifest.json");
    const original = JSON.parse(readFileSync(manifestFile, "utf8"));
    const fontFile = uploaded.body.url.slice(1);
    assert.throws(
      () => restoreBackup(backup, f.directory),
      /preserve current data/,
    );
    const existingLink = path.join(f.root, "existing-link");
    symlinkSync("missing-target", existingLink);
    assert.throws(() => restoreBackup(backup, existingLink));
    assert.equal(readlinkSync(existingLink), "missing-target");
    for (const [label, modify] of [
      [
        "missing-font",
        (manifest) => {
          delete manifest.checksums[fontFile];
        },
      ],
      [
        "extra-secret",
        (manifest) => {
          manifest.checksums["../private"] = "0".repeat(64);
        },
      ],
      [
        "extra-font",
        (manifest) => {
          const file = "fonts/11111111-1111-1111-1111-111111111111.woff2";
          writeFileSync(path.join(backup, file), fontBuffer());
          manifest.checksums[file] = createHash("sha256")
            .update(fontBuffer())
            .digest("hex");
        },
      ],
    ]) {
      const manifest = structuredClone(original);
      modify(manifest);
      writeFileSync(manifestFile, JSON.stringify(manifest));
      const target = path.join(f.root, label);
      assert.throws(() => restoreBackup(backup, target), /backup|font/i);
      assert.equal(existsSync(target), false);
    }
    writeFileSync(manifestFile, JSON.stringify(original));
    const filePath = path.join(backup, fontFile);
    rmSync(filePath);
    symlinkSync(path.join(f.directory, fontFile), filePath);
    assert.throws(
      () => restoreBackup(backup, path.join(f.root, "symlink")),
      /backup path/,
    );
    rmSync(filePath);
    writeFileSync(filePath, Buffer.alloc(5 * 1024 * 1024 + 1));
    assert.throws(
      () => restoreBackup(backup, path.join(f.root, "oversized")),
      /size limit/,
    );
    assert.equal(existsSync(path.join(f.root, "oversized")), false);
  } finally {
    f.close();
  }
});

test("a backup from the previous schema restores and adds new presentation choices without resetting content", async () => {
  const f = await fixture();
  try {
    const docs = await f.documents();
    const home = structuredClone(docs.home.value);
    const contact = structuredClone(docs.contact.value);
    home.intro.th = "Keep the owner's saved website content";
    for (const item of home.advantages) delete item.appearance;
    for (const item of contact.socials) {
      delete item.iconStyle;
      delete item.platform;
    }
    for (const [key, value] of Object.entries({ home, contact }))
      f.db
        .prepare("UPDATE documents SET value=? WHERE key=?")
        .run(JSON.stringify(value), key);
    f.db.exec(
      "DROP TABLE custom_fonts; DELETE FROM migrations WHERE version=5; DELETE FROM documents WHERE key='adminPresentation';",
    );
    const backup = path.join(f.root, "legacy-backup");
    const target = path.join(f.root, "legacy-restored");
    await createBackup(f.directory, backup);
    rmSync(path.join(backup, "fonts"), { recursive: true });
    restoreBackup(backup, target);
    const restored = createApp({ directory: target, origin, limits: false });
    try {
      const content = (await request(restored.app).get("/api/content")).body;
      assert.equal(content.home.intro.th, home.intro.th);
      assert.deepEqual(content.home.advantages[0].appearance, {
        background: "#f1f2f4",
        border: "transparent",
      });
      assert.deepEqual(
        content.contact.socials[0].iconStyle,
        docs.contact.value.socials[0].iconStyle,
      );
      assert.deepEqual(content.styles, docs.styles.value);
      assert.deepEqual(content.adminPresentation, adminPresentationDefaults);
      assert.equal(
        restored.db.prepare("SELECT max(version) version FROM migrations").get()
          .version,
        5,
      );
      assert.equal(
        restored.db.prepare("SELECT count(*) n FROM custom_fonts").get().n,
        0,
      );
    } finally {
      restored.db.close();
    }
  } finally {
    f.close();
  }
});

test("failed font backups close their snapshot, remove only their new target and preserve source data", async () => {
  const f = await fixture();
  try {
    const uploaded = await f.uploadFont();
    assert.equal(uploaded.status, 201);
    const sourceFont = path.join(f.directory, uploaded.body.url.slice(1));
    const originalFont = readFileSync(sourceFont);
    const sourceDocuments = f.db
      .prepare("SELECT * FROM documents ORDER BY key")
      .all();
    const sourceUsers = f.db
      .prepare("SELECT * FROM users ORDER BY email")
      .all();
    const sourceFonts = f.db
      .prepare("SELECT * FROM custom_fonts ORDER BY id")
      .all();
    const marker = path.join(f.directory, ".env");
    writeFileSync(marker, "PRESERVE_SOURCE=backup-failure-fixture");

    for (const [label, expectedCode] of [
      ["invalid-font", "FONT_INVALID"],
      ["missing-font", "ENOENT"],
    ]) {
      if (label === "invalid-font")
        writeFileSync(sourceFont, "invalid font bytes");
      else rmSync(sourceFont);
      const sourceFiles = readdirSync(path.join(f.directory, "fonts")).sort();
      const target = path.join(f.root, label);
      await assert.rejects(createBackup(f.directory, target), (error) => {
        assert.equal(error.code, expectedCode);
        return true;
      });
      assert.equal(existsSync(target), false);
      assert.deepEqual(
        readdirSync(path.join(f.directory, "fonts")).sort(),
        sourceFiles,
      );
      assert.equal(existsSync(sourceFont), label === "invalid-font");
      if (label === "invalid-font")
        assert.equal(readFileSync(sourceFont, "utf8"), "invalid font bytes");
      assert.deepEqual(
        f.db.prepare("SELECT * FROM documents ORDER BY key").all(),
        sourceDocuments,
      );
      assert.deepEqual(
        f.db.prepare("SELECT * FROM users ORDER BY email").all(),
        sourceUsers,
      );
      assert.deepEqual(
        f.db.prepare("SELECT * FROM custom_fonts ORDER BY id").all(),
        sourceFonts,
      );
      assert.equal(
        readFileSync(marker, "utf8"),
        "PRESERVE_SOURCE=backup-failure-fixture",
      );
      writeFileSync(sourceFont, originalFont);
    }

    const existingTarget = path.join(f.root, "existing-backup");
    mkdirSync(existingTarget);
    const existingMarker = path.join(existingTarget, "preserve.txt");
    writeFileSync(existingMarker, "An existing target belongs to its owner.");
    await assert.rejects(createBackup(f.directory, existingTarget), {
      code: "EEXIST",
    });
    assert.equal(
      readFileSync(existingMarker, "utf8"),
      "An existing target belongs to its owner.",
    );
    assert.deepEqual(readFileSync(sourceFont), originalFont);
  } finally {
    f.close();
  }
});
