import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
import { createBackup } from "../scripts/backup.js";
import { restoreBackup } from "../scripts/restore.js";

const origin = "http://localhost:3000";
const copy = (value) => structuredClone(value);
async function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "bsign-revision-02-"));
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

test("text format roles and five alignments persist while arbitrary CSS is rejected", async () => {
  const f = await fixture();
  try {
    let home = (await f.documents()).home;
    for (const align of ["left", "right", "center", "distributed", "justify"]) {
      const saved = await f.send("patch", "/api/admin/documents/home", {
        revision: home.revision,
        patch: { intro: { format: { style: "highlight", align } } },
      });
      assert.equal(saved.status, 200);
      home = saved.body;
      assert.deepEqual(home.value.intro.format, { style: "highlight", align });
    }
    const inherited = await f.send("patch", "/api/admin/documents/home", {
      revision: home.revision,
      patch: { intro: { format: { style: "inherit", align: "inherit" } } },
    });
    assert.equal(inherited.status, 200);
    home = inherited.body;
    for (const format of [
      { style: "arbitrary-role", align: "left" },
      { style: "body", align: "position:absolute" },
      { style: "url(https://attacker.test/font)", align: "center" },
      { style: "body", align: "left", color: "url(https://attacker.test/x)" },
    ]) {
      const invalid = await f.send("patch", "/api/admin/documents/home", {
        revision: home.revision,
        patch: { intro: { format } },
      });
      assert.equal(invalid.status, 400);
    }
    assert.deepEqual(
      (await f.documents()).home.value.intro.format,
      home.value.intro.format,
    );
  } finally {
    f.close();
  }
});

test("article creation and older partial clients preserve text presentation in both languages", async () => {
  const f = await fixture();
  try {
    const base = (await f.owner.get("/api/admin/articles")).body[0];
    const { id, revision, ...article } = base;
    const created = await f.send("post", "/api/admin/articles", {
      ...article,
      slug: "formatted-story",
      status: "published",
      publishedAt: "2020-01-01T00:00:00.000Z",
      title: {
        th: "ชื่อจัดรูปแบบ",
        en: "Formatted title",
        format: { style: "hero", align: "center" },
      },
      excerpt: {
        th: "บทนำ",
        en: "Introduction",
        format: { style: "intro", align: "justify" },
      },
      blocks: [
        {
          id: "block-one",
          text: {
            th: "เนื้อหาภาษาไทย",
            en: "English paragraph",
            format: { style: "body", align: "distributed" },
          },
          image: null,
          align: "left",
          ratio: "original",
        },
      ],
    });
    assert.equal(created.status, 201);
    assert.deepEqual(created.body.title.format, {
      style: "hero",
      align: "center",
    });
    assert.equal(created.body.blocks[0].text.format.align, "distributed");
    const changed = await f.send(
      "patch",
      "/api/admin/articles/" + created.body.id,
      {
        revision: created.body.revision,
        patch: {
          title: { th: "เปลี่ยนเฉพาะไทย" },
          blocks: [
            {
              id: "block-one",
              text: { th: "เนื้อหาปรับใหม่" },
              futureParagraphSetting: { keep: true },
            },
          ],
        },
      },
    );
    assert.equal(changed.status, 200);
    assert.equal(changed.body.title.en, "Formatted title");
    assert.deepEqual(changed.body.title.format, created.body.title.format);
    assert.equal(changed.body.blocks[0].text.en, "English paragraph");
    assert.deepEqual(
      changed.body.blocks[0].text.format,
      created.body.blocks[0].text.format,
    );
    const older = await f.send(
      "patch",
      "/api/admin/articles/" + created.body.id,
      {
        revision: changed.body.revision,
        patch: { excerpt: { th: "คำโปรยจาก client เดิม" } },
      },
    );
    assert.equal(older.status, 200);
    assert.deepEqual(older.body.blocks, changed.body.blocks);
    assert.deepEqual(older.body.excerpt.format, created.body.excerpt.format);
    const publicArticle = (
      await request(f.app).get("/api/articles/formatted-story")
    ).body;
    assert.deepEqual(publicArticle.title.format, created.body.title.format);
  } finally {
    f.close();
  }
});

test("embedded card icons, card names and editor section labels travel with content and reject unsafe icons", async () => {
  const f = await fixture();
  try {
    let home = (await f.documents()).home;
    const cards = copy(home.value.cards);
    cards[0].editorLabel = "การ์ดโซลูชันเฉพาะองค์กร";
    cards[0].title.format = { style: "subheading", align: "right" };
    cards[0].icon = {
      ...cards[0].icon,
      name: "Rocket",
      color: "#123456",
      background: "transparent",
    };
    cards[0].futureCardSetting = { keep: true };
    const moved = [cards[1], cards[0], ...cards.slice(2)];
    const saved = await f.send("patch", "/api/admin/documents/home", {
      revision: home.revision,
      patch: {
        cards: moved,
        editorLabels: {
          sections: {
            services: {
              title: "โซลูชันสำหรับธุรกิจ",
              description: "ปรับตามแนวทางใหม่",
            },
          },
          fields: {
            "home.cards": "รายการโซลูชัน",
            "home.services": "ข้อมูลแนะนำโซลูชัน",
          },
        },
      },
    });
    assert.equal(saved.status, 200);
    home = saved.body;
    assert.equal(home.value.cards[1].editorLabel, cards[0].editorLabel);
    assert.deepEqual(home.value.cards[1].icon, cards[0].icon);
    assert.deepEqual(home.value.cards[1].title.format, cards[0].title.format);
    assert.equal(
      home.value.editorLabels.sections.services.title,
      "โซลูชันสำหรับธุรกิจ",
    );
    const older = await f.send("patch", "/api/admin/documents/home", {
      revision: home.revision,
      patch: { intro: { th: "เปลี่ยนคำแนะนำ" } },
    });
    assert.equal(older.status, 200);
    assert.deepEqual(older.body.value.cards, home.value.cards);
    assert.deepEqual(older.body.value.editorLabels, home.value.editorLabels);
    for (const icon of [
      { ...cards[0].icon, background: "url(https://attacker.test/x)" },
      { ...cards[0].icon, color: "transparent" },
      { ...cards[0].icon, asset: "https://attacker.test/icon.svg" },
      { ...cards[0].icon, asset: "/uploads/aaaaaaaa.webp", mode: "mask" },
    ]) {
      const invalid = await f.send("patch", "/api/admin/documents/home", {
        revision: older.body.revision,
        patch: {
          cards: [
            { ...home.value.cards[0], icon },
            ...home.value.cards.slice(1),
          ],
        },
      });
      assert.equal(invalid.status, 400);
    }
    for (const editorLabels of [
      { sections: { services: { title: 42 } } },
      { fields: { "home.cards": { invalid: true } } },
    ])
      assert.equal(
        (
          await f.send("patch", "/api/admin/documents/home", {
            revision: older.body.revision,
            patch: { editorLabels },
          })
        ).status,
        400,
      );
  } finally {
    f.close();
  }
});

test("migration 3 copies saved icon appearances, footer menus and footer type without replacing custom data", async () => {
  const f = await fixture();
  try {
    const docs = await f.documents();
    const home = copy(docs.home.value),
      about = copy(docs.about.value);
    const global = copy(docs.global.value),
      styles = copy(docs.styles.value),
      icons = copy(docs.icons.value);
    for (const item of [
      ...home.cards,
      ...home.advantages,
      ...about.missions,
      ...about.cards,
    ]) {
      delete item.icon;
      delete item.footIcon;
    }
    const custom = {
      ...icons.shared.rocket,
      color: "#999999",
      background: "#ffffff",
    };
    home.cards[2].icon = custom;
    home.cards[2].editorLabel = "เก็บชื่อที่ผู้ใช้ตั้งไว้";
    home.futureSetting = { keep: true };
    icons.shared.terminal.color = "#102030";
    icons.overrides["home.service.1"] = {
      ...icons.shared.terminal,
      color: "#405060",
    };
    icons.overrides["about.foot.1"] = {
      ...icons.shared.marker,
      color: "#708090",
    };
    for (const position of ["footer.mail", "footer.phone", "footer.pin"])
      delete icons.overrides[position];
    icons.shared.mail.color = "#123456";
    icons.overrides["footer.phone"] = {
      ...icons.shared.phone,
      background: "#ddeeff",
    };
    delete global.footerNav;
    global.nav = [
      { label: { th: "หน้าแรกใหม่", en: "Custom home" }, href: "/" },
      ...global.nav.slice(1),
    ];
    delete styles.footerHeading;
    for (const [key, value] of Object.entries({
      home,
      about,
      global,
      styles,
      icons,
    })) {
      f.db
        .prepare("UPDATE documents SET value=? WHERE key=?")
        .run(JSON.stringify(value), key);
    }
    f.db.prepare("DELETE FROM migrations WHERE version=3").run();
    await f.restart();
    const migrated = await f.documents();
    assert.equal(
      f.db.prepare("SELECT max(version) version FROM migrations").get().version,
      4,
    );
    assert.equal(migrated.home.value.cards[0].icon.color, "#102030");
    assert.equal(migrated.home.value.cards[1].icon.color, "#405060");
    assert.deepEqual(migrated.home.value.cards[2].icon, custom);
    assert.equal(
      migrated.home.value.cards[2].editorLabel,
      home.cards[2].editorLabel,
    );
    assert.deepEqual(migrated.home.value.futureSetting, home.futureSetting);
    assert.equal(migrated.about.value.cards[1].footIcon.color, "#708090");
    assert.equal(
      migrated.about.value.missions[0].icon.name,
      icons.shared.eye.name,
    );
    assert.equal(
      migrated.about.value.missions[1].icon.name,
      icons.shared.rocket.name,
    );
    assert.deepEqual(migrated.global.value.footerNav, global.nav);
    assert.equal(migrated.global.value.email, "visit@bsign.work");
    assert.equal(migrated.styles.value.footerHeading.color, "#ffffff");
    assert.equal(migrated.styles.value.footerHeading.size, 18);
    assert.equal(
      migrated.icons.value.overrides["footer.pin"].background,
      "#ffffff",
    );
    assert.equal(migrated.icons.value.overrides["footer.mail"], undefined);
    assert.equal(migrated.icons.value.shared.mail.color, "#123456");
    assert.deepEqual(
      migrated.icons.value.overrides["footer.phone"],
      icons.overrides["footer.phone"],
    );
    assert.equal(migrated.icons.revision, docs.icons.revision + 1);
    for (const key of ["home", "about", "global", "styles"])
      assert.equal(migrated[key].revision, docs[key].revision + 1);
    const footerNav = copy(migrated.global.value.footerNav);
    const changed = await f.send("patch", "/api/admin/documents/global", {
      revision: migrated.global.revision,
      patch: {
        nav: [
          {
            label: { th: "เปลี่ยนเฉพาะส่วนหัว", en: "Header only" },
            href: "/about",
          },
        ],
      },
    });
    assert.equal(changed.status, 200);
    assert.deepEqual(changed.body.value.footerNav, footerNav);
    const customizedStyles = await f.send(
      "patch",
      "/api/admin/documents/styles",
      {
        revision: migrated.styles.revision,
        patch: { footerHeading: { size: 22, color: "#eeeeee" } },
      },
    );
    assert.equal(customizedStyles.status, 200);
    await f.restart();
    const again = await f.documents();
    assert.equal(again.styles.value.footerHeading.size, 22);
    assert.equal(again.home.revision, migrated.home.revision);
    assert.equal(again.about.revision, migrated.about.revision);
    assert.deepEqual(again.icons, migrated.icons);
    assert.equal(again.global.revision, changed.body.revision);
  } finally {
    f.close();
  }
});

test("formatting, editable names, card icons and footer menus survive restart and backup restore with assets", async () => {
  const f = await fixture();
  try {
    const docs = await f.documents();
    const cards = copy(docs.home.value.cards);
    cards[0].editorLabel = "การ์ดที่มีภาพไอคอน";
    cards[0].icon = {
      ...cards[0].icon,
      asset: "/uploads/aaaaaaaa.svg",
      mode: "mask",
      color: "#333333",
    };
    cards[0].title.format = { style: "highlight", align: "center" };
    const saved = await f.send("patch", "/api/admin/documents/home", {
      revision: docs.home.revision,
      patch: {
        cards,
        editorLabels: { fields: { "home.cards": "การ์ดขององค์กร" } },
      },
    });
    assert.equal(saved.status, 200);
    const bytes =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>';
    writeFileSync(path.join(f.directory, "uploads", "aaaaaaaa.svg"), bytes);
    const backup = path.join(f.root, "backup"),
      target = path.join(f.root, "restored");
    await createBackup(f.directory, backup);
    restoreBackup(backup, target);
    const restored = createApp({ directory: target, origin, limits: false });
    try {
      const content = (await request(restored.app).get("/api/content")).body;
      assert.deepEqual(content.home.cards, saved.body.value.cards);
      assert.deepEqual(
        content.home.editorLabels,
        saved.body.value.editorLabels,
      );
      assert.deepEqual(content.global.footerNav, docs.global.value.footerNav);
      assert.equal(
        readFileSync(path.join(target, "uploads", "aaaaaaaa.svg"), "utf8"),
        bytes,
      );
    } finally {
      restored.db.close();
    }
    await f.restart();
    assert.deepEqual((await f.documents()).home.value, saved.body.value);
  } finally {
    f.close();
  }
});

test("migration 4 adds panel heading typography without replacing saved styles, formats or older client data", async () => {
  for (const alreadyConfigured of [false, true]) {
    const f = await fixture();
    try {
      const initial = await f.documents();
      assert.deepEqual(initial.styles.value.panelHeading, {
        font: "Noto Sans Thai",
        size: 24,
        tablet: 22,
        mobile: 20,
        color: "#000000",
        weight: 700,
        spacing: 0,
        line: 1.6,
      });
      const legacyStyles = copy(initial.styles.value);
      legacyStyles.heading = {
        ...legacyStyles.heading,
        font: "serif",
        size: 43,
        color: "#234567",
        spacing: 1.25,
      };
      legacyStyles.futureRole = { ...legacyStyles.body, size: 17 };
      const customizedPanel = {
        ...legacyStyles.panelHeading,
        size: 29,
        tablet: 25,
        mobile: 21,
        color: "#345678",
      };
      if (alreadyConfigured) legacyStyles.panelHeading = customizedPanel;
      else delete legacyStyles.panelHeading;
      const contact = copy(initial.contact.value);
      contact.heading = {
        th: "หัวข้อที่เจ้าของเว็บบันทึกไว้",
        en: "Owner's saved heading",
        format: { style: "highlight", align: "right", futureFlag: true },
      };
      f.db
        .prepare("UPDATE documents SET value=? WHERE key='styles'")
        .run(JSON.stringify(legacyStyles));
      f.db
        .prepare("UPDATE documents SET value=? WHERE key='contact'")
        .run(JSON.stringify(contact));
      f.db.prepare("DELETE FROM migrations WHERE version=4").run();
      const before = await f.documents();

      await f.restart();
      const migrated = await f.documents();
      const expectedPanel = alreadyConfigured
        ? customizedPanel
        : initial.styles.value.panelHeading;
      assert.deepEqual(migrated.styles.value.panelHeading, expectedPanel);
      assert.equal(
        migrated.styles.revision,
        before.styles.revision + (alreadyConfigured ? 0 : 1),
      );
      assert.deepEqual(migrated.styles.value.heading, legacyStyles.heading);
      assert.deepEqual(
        migrated.styles.value.futureRole,
        legacyStyles.futureRole,
      );
      for (const key of Object.keys(before).filter((key) => key !== "styles"))
        assert.deepEqual(migrated[key], before[key]);
      assert.equal(
        f.db.prepare("SELECT count(*) n FROM migrations WHERE version=4").get()
          .n,
        1,
      );

      // An older client sends its whole known style document, omitting the
      // newly shipped role. Merge must retain it while accepting the edit.
      const oldClientStyles = copy(legacyStyles);
      delete oldClientStyles.panelHeading;
      oldClientStyles.body.size = 16;
      const oldClientSave = await f.send(
        "patch",
        "/api/admin/documents/styles",
        { revision: migrated.styles.revision, patch: oldClientStyles },
      );
      assert.equal(oldClientSave.status, 200);
      assert.deepEqual(oldClientSave.body.value.panelHeading, expectedPanel);
      assert.equal(oldClientSave.body.value.body.size, 16);
      assert.deepEqual(oldClientSave.body.value.heading, legacyStyles.heading);

      const panelPatch = {
        font: "Noto Sans",
        size: 26,
        tablet: 23,
        mobile: 21,
        line: 1.55,
        spacing: 0.75,
        color: "#123456",
      };
      const savedStyles = await f.send("patch", "/api/admin/documents/styles", {
        revision: oldClientSave.body.revision,
        patch: { panelHeading: panelPatch },
      });
      assert.equal(savedStyles.status, 200);
      assert.deepEqual(savedStyles.body.value.panelHeading, {
        ...expectedPanel,
        ...panelPatch,
      });
      const savedContact = await f.send(
        "patch",
        "/api/admin/documents/contact",
        {
          revision: migrated.contact.revision,
          patch: {
            heading: { format: { style: "panelHeading", align: "center" } },
            formHeading: { format: { style: "panelHeading", align: "center" } },
          },
        },
      );
      assert.equal(savedContact.status, 200);
      assert.equal(savedContact.body.value.heading.th, contact.heading.th);
      assert.equal(savedContact.body.value.heading.en, contact.heading.en);
      assert.equal(savedContact.body.value.heading.format.futureFlag, true);

      await f.restart();
      const restarted = await f.documents();
      assert.deepEqual(restarted.styles, savedStyles.body);
      assert.deepEqual(restarted.contact, savedContact.body);
      const publicContact = (await request(f.app).get("/api/content")).body;
      assert.deepEqual(publicContact.styles.panelHeading, {
        ...expectedPanel,
        ...panelPatch,
      });
      assert.equal(publicContact.contact.heading.format.style, "panelHeading");
      assert.equal(
        publicContact.contact.formHeading.format.style,
        "panelHeading",
      );
    } finally {
      f.close();
    }
  }
});
