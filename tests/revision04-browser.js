import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { siTiktok, siYoutube } from "simple-icons";
import { startPreview } from "../server/preview.js";
import { readInitialCredentials } from "./initial-admin-login-smoke.js";

// This fixture owns its database and generated account. Never open .data or
// reuse a person's preview, credentials, social accounts, or inbox messages.
const directory = mkdtempSync(path.join(tmpdir(), "bsign-revision04-ui-"));
mkdirSync("test-results", { recursive: true });
let runtime, browser, adminContext, visitorContext, admin, visitor, credentials;
let checks = 0;
let activeCheck = "startup";
const pageErrors = [];
const platformNames = [
  "Facebook",
  "Instagram",
  "TikTok",
  "YouTube",
  "LINE",
  "X (Twitter)",
  "Threads",
  "LinkedIn",
  "Pinterest",
  "Snapchat",
  "Reddit",
  "Discord",
  "Telegram",
  "WhatsApp",
  "Bluesky",
  "WeChat",
  "Weibo",
  "Douyin",
  "Kuaishou",
  "Xiaohongshu (RedNote)",
];
const channel = {
  name: { th: "ช่องทาง TikTok ทดสอบ", en: "TikTok test channel" },
  handle: "@tiktok",
  href: "https://www.tiktok.com/@tiktok",
  color: "#2468ac",
};
const formCopy = {
  label: { th: "ชื่อสำหรับติดต่อกลับ", en: "Your contact name" },
  placeholder: { th: "กรอกชื่อผู้ติดต่อ", en: "Enter your contact name" },
  success: {
    th: "ได้รับข้อความทดสอบแล้ว ขอบคุณที่ติดต่อ",
    en: "Test message received. Thank you for contacting us.",
  },
  invalid: {
    th: "กรุณากรอกข้อมูลทดสอบให้ครบและยอมรับข้อตกลง",
    en: "Complete the test fields and accept the agreement.",
  },
};
const message = {
  name: "Revision 04 Contact",
  email: "revision04@example.test",
  message:
    "A contact message submitted through the newly arranged public form.",
};
const colors = { background: "#123456", border: "#654321" };

async function check(name, test) {
  activeCheck = name;
  await test();
  checks++;
  console.log(`ok ${checks}: ${name}`);
}
async function connect() {
  adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  visitorContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  admin = await adminContext.newPage();
  visitor = await visitorContext.newPage();
  for (const page of [admin, visitor]) {
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => pageErrors.push(error.message));
  }
  credentials = readInitialCredentials(runtime.initialAdmin.file);
  await admin.goto(runtime.origin + "/admin");
  await admin.getByLabel("อีเมล", { exact: true }).fill(credentials.email);
  await admin.getByLabel("รหัสผ่าน", { exact: true }).fill(credentials.password);
  await admin.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await admin.locator(".cms-maintenance-controls").waitFor();
}
async function request(method, url, body) {
  return admin.evaluate(
    async ({ method, url, body }) => {
      const session = await (await fetch("/api/session")).json();
      const response = await fetch("/api" + url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": session.csrf,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(
          `${method} ${url}: ${response.status} ${result.error || "UNKNOWN"}`,
        );
      return result;
    },
    { method, url, body },
  );
}
async function navigate(label, tab) {
  const menu = admin.getByRole("button", { name: "เปิดเมนูจัดการ", exact: true });
  if (
    (await menu.isVisible()) &&
    (await menu.getAttribute("aria-expanded")) !== "true"
  )
    await menu.click();
  await admin
    .locator(".cms-navigation")
    .getByRole("button", { name: label, exact: true })
    .click();
  if (tab)
    await admin
      .locator(".cms-website-tabs")
      .getByRole("button", { name: tab, exact: true })
      .click();
}
async function language(lang) {
  await admin
    .getByRole("button", {
      name: lang === "th" ? "แก้ไขภาษาไทย" : "แก้ไขภาษาอังกฤษ",
      exact: true,
    })
    .click();
}
function field(fieldPath) {
  return admin.locator(`.cms-bilingual-field[data-field-path="${fieldPath}"]`);
}
async function editText(fieldPath, value, lang = "th") {
  await field(fieldPath)
    .getByLabel(lang === "th" ? "ไทย" : "English", { exact: true })
    .first()
    .fill(value);
}
async function saveDocument(key) {
  const save = admin
    .locator(".cms-savebar")
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true });
  await expect(save).toBeEnabled();
  const response = admin.waitForResponse(
    (response) =>
      response.url().endsWith("/api/admin/documents/" + key) &&
      response.request().method() === "PATCH",
  );
  await save.click();
  assert.ok((await response).ok(), `${key} document PATCH succeeds`);
  await expect(save).toBeDisabled();
}
async function publicContact() {
  await visitor.goto(runtime.origin + "/contact");
  await visitor.locator('header .languages button[lang="th"]').click();
  await expect(visitor.locator("html")).toHaveAttribute("lang", "th");
}
async function cardStyles() {
  await visitor.goto(runtime.origin + "/");
  await expect(visitor.locator(".advantages > article")).toHaveCount(3);
  return visitor.locator(".advantages > article").evaluateAll((cards) =>
    cards.map((card) => {
      const style = getComputedStyle(card);
      return {
        background: style.backgroundColor,
        frame: style.boxShadow,
      };
    }),
  );
}
function appearance() {
  return admin.locator(
    '.cms-card-appearance-editor[data-field-path="home.advantages.0.appearance"]',
  );
}
async function setCardColors() {
  await appearance()
    .getByLabel("รหัสสีพื้นหลัง HEX สีของการ์ดนี้", { exact: true })
    .fill(colors.background);
  await appearance().getByLabel("ไม่ใช้สีเส้นกรอบ", { exact: true }).uncheck();
  await appearance()
    .getByLabel("รหัสสีเส้นกรอบ HEX สีของการ์ดนี้", { exact: true })
    .fill(colors.border);
}
const withoutAppearance = (card) => {
  const { appearance, ...content } = card;
  return content;
};

try {
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  await connect();
  const original = await request("GET", "/admin/documents");
  const originalSocials = original.contact.value.socials;
  const newIndex = originalSocials.length;
  await navigate("ข้อมูลเว็บไซต์", "ติดต่อเรา");

  await check(
    "contact sections, field cards and status messages have distinct groups",
    async () => {
      await expect(admin.locator("[data-contact-section]")).toHaveCount(5);
      assert.deepEqual(
        await admin
          .locator("[data-contact-section]")
          .evaluateAll((sections) =>
            sections.map((section) => section.dataset.contactSection),
          ),
        ["intro", "channels", "socials", "form", "map"],
      );
      await expect(admin.locator("[data-form-field]")).toHaveCount(5);
      for (const key of ["name", "company", "email", "phone", "message"]) {
        const card = admin.locator(`[data-form-field="${key}"]`);
        await expect(
          card.locator(`[data-field-path="contact.fields.${key}.label"]`),
        ).toHaveCount(1);
        await expect(
          card.locator(`[data-field-path="contact.fields.${key}.placeholder"]`),
        ).toHaveCount(1);
      }
      await expect(admin.locator("[data-contact-status]")).toHaveCount(3);
      assert.deepEqual(
        await admin
          .locator("[data-contact-status]")
          .evaluateAll((statuses) =>
            statuses.map((status) => status.dataset.contactStatus),
          ),
        ["pending", "success", "invalid"],
      );
      await expect(
        admin.locator('[data-contact-shared="error"]'),
      ).toContainText(original.global.value.error.th);
    },
  );
  await check("each contact record owns its matching icon editor", async () => {
    for (const [record, label] of [
      ["email", "ไอคอนอีเมล"],
      ["phone", "ไอคอนโทรศัพท์"],
      ["hours", "ไอคอนเวลาทำการ"],
      ["submit", "ไอคอนปุ่มส่งข้อความ"],
      ["office", "ไอคอนสำนักงาน"],
    ]) {
      const editor = admin.locator(
        `[data-contact-record="${record}"] .cms-inline-icon-editor`,
      );
      await expect(editor).toHaveCount(1);
      await expect(editor).toHaveAttribute("aria-label", label);
    }
    for (let i = 0; i < newIndex; i++)
      await expect(
        admin.locator(`[data-social-index="${i}"] .cms-inline-icon-editor`),
      ).toHaveCount(1);
    await expect(
      admin.locator(".cms-contact-editor .cms-inline-icon-editor"),
    ).toHaveCount(newIndex + 5);
    await expect(
      admin.locator('[data-contact-record="map"] .cms-inline-icon-editor'),
    ).toHaveCount(0);
  });
  await check(
    "platform dropdown contains exactly the twenty requested platforms",
    async () => {
      const options = admin
        .getByLabel("เลือกแพลตฟอร์มโซเชียลมีเดีย", { exact: true })
        .locator("option");
      assert.deepEqual(await options.allTextContents(), platformNames);
      assert.equal(
        new Set(
          await options.evaluateAll((options) =>
            options.map((option) => option.value),
          ),
        ).size,
        20,
      );
    },
  );
  await check(
    "new TikTok channel starts blank and its text and icon controls work",
    async () => {
      await admin
        .getByLabel("เลือกแพลตฟอร์มโซเชียลมีเดีย", { exact: true })
        .selectOption("tiktok");
      await admin
        .getByRole("button", { name: "เพิ่มช่องทางโซเชียล", exact: true })
        .click();
      const row = admin.locator(`[data-social-index="${newIndex}"]`);
      await expect(row.getByLabel("ชื่อบัญชีที่แสดง", { exact: true })).toHaveValue(
        "",
      );
      await expect(row.getByLabel("ลิงก์ปลายทาง", { exact: true })).toHaveValue(
        "",
      );
      for (const lang of ["th", "en"]) {
        await language(lang);
        await editText(
          `contact.socials.${newIndex}.name`,
          channel.name[lang],
          lang,
        );
      }
      await language("th");
      await row.getByLabel("ชื่อบัญชีที่แสดง", { exact: true }).fill(channel.handle);
      await row.getByLabel("ลิงก์ปลายทาง", { exact: true }).fill(channel.href);
      await row.locator(".cms-contact-icon-settings > summary").click();
      const editor = row.locator(".cms-inline-icon-editor");
      const picker = editor.getByRole("combobox").first();
      await picker.selectOption("youtube");
      await expect(editor.locator(".cms-icon-sample path")).toHaveAttribute(
        "d",
        siYoutube.path,
      );
      await picker.selectOption("tiktok");
      await editor
        .getByLabel(`รหัสสีไอคอน ไอคอนช่องทาง ${newIndex + 1}`, { exact: true })
        .fill(channel.color);
      await expect(row.locator(".cms-contact-social-preview .icon")).toHaveCSS(
        "color",
        "rgb(36, 104, 172)",
      );
    },
  );
  let savedContact;
  await check(
    "saving the channel stores its own icon style and preserves other rows",
    async () => {
      await saveDocument("contact");
      const documents = await request("GET", "/admin/documents");
      savedContact = documents.contact.value;
      assert.deepEqual(
        savedContact.socials.slice(0, newIndex),
        originalSocials,
      );
      const row = savedContact.socials[newIndex];
      assert.equal(row.platform, "tiktok");
      assert.equal(row.icon, "tiktok");
      assert.deepEqual(row.name, channel.name);
      assert.equal(row.handle, channel.handle);
      assert.equal(row.href, channel.href);
      assert.equal(row.iconStyle.name, "tiktok");
      assert.equal(row.iconStyle.color, channel.color);
      assert.deepEqual(
        documents.icons.value,
        original.icons.value,
        "row icon edits must not change shared icon settings",
      );
    },
  );
  await check(
    "public social channel renders the real TikTok logo path and destination",
    async () => {
      await publicContact();
      const link = visitor.locator(`.social a[href="${channel.href}"]`);
      await expect(link).toHaveCount(1);
      await expect(link).toContainText(channel.name.th);
      await expect(link).toContainText(channel.handle);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link.locator(".icon path")).toHaveAttribute(
        "d",
        siTiktok.path,
      );
      await expect(link.locator(".icon")).toHaveCSS(
        "color",
        "rgb(36, 104, 172)",
      );
    },
  );
  await check(
    "reordering carries the social icon style and leaves existing records intact",
    async () => {
      for (let i = newIndex; i > 0; i--) {
        await admin
          .getByRole("button", { name: `ย้ายช่องทาง ${i + 1} ขึ้น`, exact: true })
          .click();
        await expect(
          admin
            .locator(`[data-social-index="${i - 1}"]`)
            .getByLabel("ลิงก์ปลายทาง", { exact: true }),
        ).toHaveValue(channel.href);
      }
      await saveDocument("contact");
      const reordered = (await request("GET", "/admin/documents")).contact
        .value;
      assert.deepEqual(reordered.socials[0], savedContact.socials[newIndex]);
      assert.deepEqual(reordered.socials.slice(1), originalSocials);
      savedContact = reordered;
      await publicContact();
      await expect(
        visitor.locator(".social > div > a").first(),
      ).toHaveAttribute("href", channel.href);
      await expect(
        visitor.locator(".social > div > a").first().locator(".icon path"),
      ).toHaveAttribute("d", siTiktok.path);
    },
  );
  await check(
    "form label, placeholder and response messages save independently in both languages",
    async () => {
      for (const lang of ["th", "en"]) {
        await language(lang);
        await editText("contact.fields.name.label", formCopy.label[lang], lang);
        await editText(
          "contact.fields.name.placeholder",
          formCopy.placeholder[lang],
          lang,
        );
        await editText("contact.success", formCopy.success[lang], lang);
        await editText("contact.invalid", formCopy.invalid[lang], lang);
      }
      await language("th");
      await saveDocument("contact");
      const contact = (await request("GET", "/admin/documents")).contact.value;
      assert.deepEqual(contact.fields.name.label, formCopy.label);
      assert.deepEqual(contact.fields.name.placeholder, formCopy.placeholder);
      assert.deepEqual(contact.success, formCopy.success);
      assert.deepEqual(contact.invalid, formCopy.invalid);
      for (const key of ["company", "email", "phone", "message"])
        assert.deepEqual(
          contact.fields[key],
          original.contact.value.fields[key],
        );
      assert.deepEqual(contact.socials, savedContact.socials);
      savedContact = contact;
    },
  );
  await check(
    "blank public form displays the saved validation message without posting",
    async () => {
      await publicContact();
      let posts = 0;
      const countPosts = (request) => {
        if (
          request.url().endsWith("/api/contact") &&
          request.method() === "POST"
        )
          posts++;
      };
      visitor.on("request", countPosts);
      try {
        await visitor
          .locator('.form-card button[type="submit"], .form-card form > button')
          .click();
        await expect(
          visitor.locator(".form-card form [role=status]"),
        ).toHaveText(formCopy.invalid.th);
      } finally {
        visitor.off("request", countPosts);
      }
      assert.equal(
        posts,
        0,
        "native validation prevents an incomplete contact POST",
      );
      assert.deepEqual(await request("GET", "/admin/contacts"), []);
    },
  );
  await check(
    "public form uses the saved copy and actually submits successfully",
    async () => {
      const name = visitor.getByLabel(formCopy.label.th, { exact: false });
      await expect(name).toHaveAttribute(
        "placeholder",
        formCopy.placeholder.th,
      );
      await name.fill(message.name);
      await visitor
        .locator('.form-card input[name="email"]')
        .fill(message.email);
      await visitor
        .locator('.form-card textarea[name="message"]')
        .fill(message.message);
      await visitor.locator('.form-card input[name="consent"]').check();
      const submission = visitor.waitForResponse(
        (response) =>
          response.url().endsWith("/api/contact") &&
          response.request().method() === "POST",
      );
      await visitor
        .locator('.form-card button[type="submit"], .form-card form > button')
        .click();
      assert.ok((await submission).ok(), "public contact POST succeeds");
      await expect(visitor.locator(".form-card form [role=status]")).toHaveText(
        formCopy.success.th,
      );
      await expect(name).toHaveValue("");
    },
  );
  await check(
    "submitted contact is visible in the admin inbox and message detail",
    async () => {
      await navigate("กล่องข้อความ");
      const row = admin
        .locator(".cms-table tbody tr")
        .filter({ hasText: message.email });
      await expect(row).toHaveCount(1);
      await row
        .getByRole("button", {
          name: "เปิดข้อความจาก " + message.name,
          exact: true,
        })
        .click();
      await expect(admin.locator(".cms-message-detail")).toContainText(
        message.email,
      );
      await expect(admin.locator(".cms-message-body")).toHaveText(
        message.message,
      );
      const inbox = await request("GET", "/admin/contacts");
      assert.equal(inbox.length, 1);
      assert.equal(inbox[0].value.email, message.email);
      assert.equal(inbox[0].value.name, message.name);
    },
  );

  const originalCardStyles = await cardStyles();
  await navigate("ข้อมูลเว็บไซต์", "หน้าแรก");
  await check(
    "each advantage card owns its appearance controls and preview",
    async () => {
      const controls = admin.locator(
        '.cms-card-appearance-editor[data-field-path^="home.advantages."]',
      );
      await expect(controls).toHaveCount(original.home.value.advantages.length);
      await expect(appearance().locator(".cms-appearance-preview")).toHaveCSS(
        "background-color",
        originalCardStyles[0].background,
      );
      await expect(
        appearance().getByLabel("ไม่ใช้สีเส้นกรอบ", { exact: true }),
      ).toBeChecked();
    },
  );
  await check(
    "first-card colors update its preview while saved and public colors stay unchanged",
    async () => {
      await setCardColors();
      await expect(appearance().locator(".cms-appearance-preview")).toHaveCSS(
        "background-color",
        "rgb(18, 52, 86)",
      );
      await expect(appearance().locator(".cms-appearance-preview")).toHaveCSS(
        "box-shadow",
        /rgb\(101, 67, 33\).*1px.*inset/,
      );
      assert.deepEqual(
        (await request("GET", "/admin/documents")).home.value,
        original.home.value,
      );
      assert.deepEqual(await cardStyles(), originalCardStyles);
    },
  );
  let savedHome;
  await check(
    "saving local colors changes only the first advantage card on the public page",
    async () => {
      await saveDocument("home");
      savedHome = (await request("GET", "/admin/documents")).home.value;
      assert.deepEqual(savedHome.advantages[0].appearance, colors);
      assert.deepEqual(
        withoutAppearance(savedHome.advantages[0]),
        withoutAppearance(original.home.value.advantages[0]),
      );
      assert.deepEqual(
        savedHome.advantages.slice(1),
        original.home.value.advantages.slice(1),
      );
      assert.deepEqual(
        { ...savedHome, advantages: original.home.value.advantages },
        original.home.value,
      );
      const publicStyles = await cardStyles();
      assert.equal(publicStyles[0].background, "rgb(18, 52, 86)");
      assert.match(publicStyles[0].frame, /rgb\(101, 67, 33\).*1px.*inset/);
      assert.deepEqual(publicStyles.slice(1), originalCardStyles.slice(1));
    },
  );
  await check(
    "reset previews the first card's defaults without implicitly saving",
    async () => {
      await appearance()
        .getByRole("button", { name: "คืนค่าสีการ์ดนี้", exact: true })
        .click();
      await expect(appearance().locator(".cms-appearance-preview")).toHaveCSS(
        "background-color",
        originalCardStyles[0].background,
      );
      await expect(
        appearance().getByLabel("ไม่ใช้สีเส้นกรอบ", { exact: true }),
      ).toBeChecked();
      assert.deepEqual(
        (await request("GET", "/admin/documents")).home.value,
        savedHome,
      );
      assert.equal((await cardStyles())[0].background, "rgb(18, 52, 86)");
    },
  );
  await check(
    "saving card reset preserves text, icons, other cards and contact edits",
    async () => {
      await saveDocument("home");
      const documents = await request("GET", "/admin/documents");
      assert.deepEqual(documents.home.value, original.home.value);
      assert.deepEqual(documents.contact.value, savedContact);
      assert.deepEqual(await cardStyles(), originalCardStyles);
    },
  );
  await check("custom card colors can be saved again after reset", async () => {
    await setCardColors();
    await saveDocument("home");
    savedHome = (await request("GET", "/admin/documents")).home.value;
    assert.deepEqual(savedHome.advantages[0].appearance, colors);
    await appearance().screenshot({
      path: "test-results/revision04-card-appearance.png",
      animations: "disabled",
    });
  });
  await check(
    "contact settings, row order, icon style, colors and inbox survive restart",
    async () => {
      await adminContext.close();
      await visitorContext.close();
      await runtime.close();
      runtime = await startPreview({ directory, provisionInitialAdmin: true });
      await connect();
      const documents = await request("GET", "/admin/documents");
      assert.deepEqual(documents.contact.value, savedContact);
      assert.deepEqual(documents.home.value, savedHome);
      assert.deepEqual(documents.icons.value, original.icons.value);
      assert.equal(
        (await request("GET", "/admin/contacts"))[0].value.email,
        message.email,
      );
      await publicContact();
      await expect(
        visitor.getByLabel(formCopy.label.th, { exact: false }),
      ).toHaveAttribute("placeholder", formCopy.placeholder.th);
      await expect(
        visitor.locator(".social > div > a").first(),
      ).toHaveAttribute("href", channel.href);
      await expect(
        visitor.locator(".social > div > a").first().locator(".icon"),
      ).toHaveCSS("color", "rgb(36, 104, 172)");
      const publicStyles = await cardStyles();
      assert.equal(publicStyles[0].background, "rgb(18, 52, 86)");
      assert.match(publicStyles[0].frame, /rgb\(101, 67, 33\).*1px.*inset/);
      assert.deepEqual(publicStyles.slice(1), originalCardStyles.slice(1));
    },
  );
  assert.deepEqual(pageErrors, [], "Unexpected browser errors");
  console.log(
    `PASS: ${checks} revision04 browser checks; contact grouping, twenty platforms, local social icons and reorder, public form and inbox, local card colors and reset, restart persistence`,
  );
} catch (error) {
  let safe = String(error.stack || error);
  for (const secret of [
    credentials?.password,
    credentials?.email,
    runtime?.token,
  ])
    if (secret) safe = safe.replaceAll(secret, "[REDACTED]");
  if (process.env.GITHUB_ACTIONS)
    console.error(
      `::error title=Revision 04 browser regression::${checks} checks completed; ${activeCheck}; ${error.stack?.match(/revision04-browser\.js:\d+:\d+/)?.[0] || "unknown"}`,
    );
  for (const [name, page] of [
    ["admin", admin],
    ["public", visitor],
  ]) {
    if (page && !page.isClosed())
      await page
        .screenshot({
          path: `test-results/revision04-failure-${name}.png`,
          fullPage: true,
          animations: "disabled",
        })
        .catch(() => {});
  }
  console.error(safe);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (runtime) await runtime.close();
  rmSync(directory, { recursive: true, force: true });
}
