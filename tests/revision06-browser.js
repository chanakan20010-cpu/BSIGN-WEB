import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { startPreview } from "../server/preview.js";
import { readInitialCredentials } from "./initial-admin-login-smoke.js";

// Every account, uploaded file and editor draft here belongs to this disposable
// preview. Never inspect .data/.env or publish credentials in test diagnostics.
const directory = mkdtempSync(path.join(tmpdir(), "bsign-revision06-ui-"));
mkdirSync("test-results", { recursive: true });
let runtime, browser, adminContext, visitorContext, admin, visitor, credentials;
let checks = 0,
  activeCheck = "startup",
  original,
  customFont,
  savedIntro;
let oldest, used, discard;
const pageErrors = [];
const format = {
  font: "Sarabun",
  size: 22,
  weight: 700,
  italic: true,
  underline: true,
  strike: false,
  color: "#245a86",
  background: "#fff1bd",
  align: "center",
  line: 1.8,
  spacing: 0.6,
};
const roleLabels = {
  brand: "ชื่อแบรนด์",
  hero: "หัวข้อใหญ่",
  heading: "หัวข้อของส่วน",
  panelHeading: "หัวข้อการ์ดเนื้อหา",
  subheading: "หัวข้อรอง",
  body: "เนื้อหา",
  inverse: "เนื้อหาบนพื้นเข้ม",
  intro: "ข้อความแนะนำ",
  highlight: "ข้อความไฮไลต์",
  menu: "เมนู",
  button: "ปุ่ม",
  label: "ป้ายกำกับ",
  footer: "ส่วนท้าย",
  footerHeading: "หัวข้อส่วนท้าย",
  footerBrand: "ชื่อแบรนด์ส่วนท้าย",
};
const publicSelectors = {
  brand: "header .type-brand",
  hero: ".hero .type-hero",
  heading: ".services .type-heading",
  subheading: ".service .type-subheading",
  body: ".service .type-body",
  inverse: ".cta .type-inverse",
  intro: ".hero .type-intro",
  highlight: ".service .type-highlight",
  menu: "header #navigation a.type-menu",
  button: ".hero .button.type-button",
  footer: "footer .footer-address .type-footer",
  footerHeading: "footer .type-footerHeading",
  footerBrand: "footer .type-footerBrand",
  panelHeading: ".contact-info .type-panelHeading",
  label: ".form-grid label.type-label",
};
async function check(name, run) {
  activeCheck = name;
  await run();
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
      const { csrf } = await (await fetch("/api/session")).json();
      const response = await fetch("/api" + url, {
        method,
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok)
        throw Error(`Fixture ${method} ${url} failed (${response.status})`);
      return response.status === 204 ? null : response.json();
    },
    { method, url, body },
  );
}
async function patchDocument(key, patch) {
  const docs = await request("GET", "/admin/documents");
  return request("PATCH", "/admin/documents/" + key, {
    revision: docs[key].revision,
    patch,
  });
}
async function openView(view) {
  await admin.goto(runtime.origin + "/admin?view=" + view);
  await admin.locator(".cms-navigation").waitFor({ state: "attached" });
  await expect(admin.locator(".cms-page-heading")).toHaveCount(1);
}
function field(name) {
  return admin.locator(`.cms-bilingual-field[data-field-path="${name}"]`);
}
function frame(scope = admin.locator(".cms-type-sample")) {
  return scope.frameLocator("iframe.cms-public-text-frame");
}
async function sample(scope) {
  await scope.scrollIntoViewIfNeeded();
  const target = frame(scope).locator("[data-preview-text]").first();
  await expect(target).toBeVisible();
  return target;
}
async function advanced(name) {
  const details = field(name).locator(".cms-text-format-controls");
  await expect(details).toHaveCount(1);
  if ((await details.getAttribute("open")) === null)
    await details.locator(":scope > summary").click();
  return details;
}
async function saveDocument(key) {
  const button = admin
    .locator(".cms-savebar")
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true });
  await expect(button).toBeEnabled();
  const response = admin.waitForResponse(
    (r) =>
      r.url().endsWith("/api/admin/documents/" + key) &&
      r.request().method() === "PATCH",
  );
  await button.click();
  assert.equal((await response).status(), 200);
  await expect(button).toBeDisabled();
}
async function discardDraft() {
  const reset = admin
    .locator(".cms-savebar")
    .getByRole("button", { name: "ยกเลิกการแก้ไข", exact: true });
  if (await reset.isEnabled()) {
    admin.once("dialog", (dialog) => dialog.accept());
    await reset.click();
  }
  await expect(
    admin
      .locator(".cms-savebar")
      .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true }),
  ).toBeDisabled();
}
async function uploadMedia(name) {
  return admin.evaluate(async (name) => {
    const { csrf } = await (await fetch("/api/session")).json();
    const body = new FormData();
    body.set(
      "file",
      new File(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80"><circle cx="40" cy="40" r="22" fill="#d99a00"/></svg>',
        ],
        name,
        { type: "image/svg+xml" },
      ),
    );
    body.set("source", "Original acceptance fixture");
    body.set("license", "CC0");
    const response = await fetch("/api/admin/media", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
      body,
    });
    if (!response.ok)
      throw Error("Media fixture upload failed: " + response.status);
    return { ...(await response.json()), name };
  }, name);
}
async function uploadFont() {
  const bytes = readFileSync(
    new URL(
      "../node_modules/@fontsource/itim/files/itim-thai-400-normal.woff2",
      import.meta.url,
    ),
  );
  return admin.evaluate(
    async (bytes) => {
      const { csrf } = await (await fetch("/api/session")).json();
      const body = new FormData();
      body.set("label", "QA Thai preview font");
      body.set("license", "OFL-1.1");
      body.set(
        "file",
        new File([new Uint8Array(bytes)], "qa-preview.woff2", {
          type: "font/woff2",
        }),
      );
      const response = await fetch("/api/admin/fonts", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf },
        body,
      });
      if (!response.ok)
        throw Error("Font fixture upload failed: " + response.status);
      return response.json();
    },
    [...bytes],
  );
}
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Page must fit its viewport",
  );
}
async function audit(page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    result.violations
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) => v.id),
    [],
  );
}
async function css(locator) {
  return locator.evaluate((element) => {
    const s = getComputedStyle(element);
    return Object.fromEntries(
      [
        "fontFamily",
        "fontSize",
        "fontWeight",
        "fontStyle",
        "color",
        "letterSpacing",
        "lineHeight",
        "textDecorationLine",
        "backgroundColor",
        "borderRadius",
      ].map((key) => [key, s[key]]),
    );
  });
}
async function selectRole(role) {
  await admin
    .locator(".cms-style-kinds")
    .getByRole("button", { name: roleLabels[role], exact: true })
    .click();
  await expect(
    admin.locator(".cms-type-sample iframe.cms-public-text-frame"),
  ).toHaveAttribute("data-preview-role", role);
  return sample(admin.locator(".cms-type-sample"));
}
async function visitorLanguage(language) {
  await visitor.locator(`header .languages button[lang="${language}"]`).click();
  await expect(visitor.locator("html")).toHaveAttribute("lang", language);
  await visitor.evaluate(() => document.fonts.ready);
}

try {
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  await connect();
  original = await request("GET", "/admin/documents");
  oldest = await uploadMedia("qa-oldest-unused.svg");
  used = await uploadMedia("qa-used-logo.svg");
  discard = await uploadMedia("qa-delete-unused.svg");
  await patchDocument("global", {
    logo: {
      url: used.url,
      alt: { th: "โลโก้ทดสอบ", en: "QA logo" },
      crop: null,
    },
    footerLogo: {
      url: used.url,
      alt: { th: "โลโก้ส่วนท้ายทดสอบ", en: "QA footer logo" },
      crop: null,
    },
  });
  customFont = await uploadFont();

  await check(
    "media cards expose delete actions and saved usage without changing files",
    async () => {
      await openView("media");
      await expect(admin.locator("figure[data-media-id]")).toHaveCount(3);
      const item = admin.locator(`figure[data-media-id="${used.id}"]`);
      await expect(
        item.getByRole("button", { name: "ลบไฟล์ " + used.name, exact: true }),
      ).toBeDisabled();
      await expect(item).toContainText("ใช้งาน");
      const row = (await request("GET", "/admin/media")).find(
        (m) => m.id === used.id,
      );
      assert.equal(row.inUse, true);
      assert.ok(row.usageCount >= 2);
      assert.equal(
        (await visitor.request.get(runtime.origin + used.url)).status(),
        200,
      );
    },
  );
  await check(
    "cancelling the named media dialog preserves the asset and restores focus",
    async () => {
      const item = admin.locator(`figure[data-media-id="${discard.id}"]`);
      const remove = item.getByRole("button", {
        name: "ลบไฟล์ " + discard.name,
        exact: true,
      });
      await remove.click();
      const dialog = admin.getByRole("dialog", {
        name: "ลบไฟล์จากคลังสื่อ",
        exact: true,
      });
      await expect(dialog).toContainText(discard.name);
      await dialog.getByRole("button", { name: "ยกเลิก", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(remove).toBeFocused();
      assert.ok(
        (await request("GET", "/admin/media")).some((m) => m.id === discard.id),
      );
    },
  );
  await check(
    "confirming unused media deletion removes its file and preserves referenced media",
    async () => {
      await admin
        .locator(`figure[data-media-id="${discard.id}"]`)
        .getByRole("button", { name: "ลบไฟล์ " + discard.name, exact: true })
        .click();
      const response = admin.waitForResponse(
        (r) =>
          r.url().endsWith("/api/admin/media/" + discard.id) &&
          r.request().method() === "DELETE",
      );
      await admin
        .getByRole("dialog")
        .getByRole("button", { name: "ยืนยันลบไฟล์", exact: true })
        .click();
      assert.equal((await response).status(), 200);
      await expect(
        admin.locator(`figure[data-media-id="${discard.id}"]`),
      ).toHaveCount(0);
      assert.equal(
        (await visitor.request.get(runtime.origin + discard.url)).status(),
        404,
      );
      assert.equal(
        (await visitor.request.get(runtime.origin + used.url)).status(),
        200,
      );
    },
  );
  await check(
    "deleting the final row on a media page returns to an existing page",
    async () => {
      for (let i = 0; i < 11; i++) await uploadMedia(`qa-padding-${i}.svg`);
      await openView("media");
      await expect(admin.locator("figure[data-media-id]")).toHaveCount(12);
      await admin.getByRole("button", { name: "หน้าถัดไป", exact: true }).click();
      await expect(admin.locator("figure[data-media-id]")).toHaveCount(1);
      await admin
        .locator(`figure[data-media-id="${oldest.id}"]`)
        .getByRole("button", { name: "ลบไฟล์ " + oldest.name, exact: true })
        .click();
      const response = admin.waitForResponse(
        (r) =>
          r.url().endsWith("/api/admin/media/" + oldest.id) &&
          r.request().method() === "DELETE",
      );
      await admin
        .getByRole("dialog")
        .getByRole("button", { name: "ยืนยันลบไฟล์", exact: true })
        .click();
      assert.equal((await response).status(), 200);
      await expect(admin.locator("figure[data-media-id]")).toHaveCount(12);
      await expect(admin.locator(".cms-pagination")).toContainText("หน้า 1 / 1");
      await noOverflow(admin);
      await admin.screenshot({
        path: "test-results/revision06-media-library.png",
        fullPage: true,
        animations: "disabled",
      });
    },
  );

  const actual = {};
  await visitor.goto(runtime.origin + "/");
  await visitorLanguage("th");
  for (const [role, selector] of Object.entries(publicSelectors)) {
    if (["panelHeading", "label", "inverse"].includes(role)) continue;
    actual[role] = await css(visitor.locator(selector).first());
  }
  await visitor.goto(runtime.origin + "/about");
  actual.inverse = await css(visitor.locator(publicSelectors.inverse).first());
  await visitor.goto(runtime.origin + "/contact");
  for (const role of ["panelHeading", "label"])
    actual[role] = await css(visitor.locator(publicSelectors[role]).first());

  await check(
    "all typography roles use isolated website previews with matching font metrics",
    async () => {
      await openView("styles");
      for (const role of Object.keys(roleLabels)) {
        const target = await selectRole(role);
        const expected = actual[role];
        await expect(target).toHaveCSS("font-size", expected.fontSize);
        const rendered = await css(target);
        assert.equal(
          rendered.fontFamily,
          expected.fontFamily,
          role + " font family",
        );
        assert.equal(
          rendered.letterSpacing,
          expected.letterSpacing,
          role + " tracking",
        );
        assert.equal(
          rendered.lineHeight,
          expected.lineHeight,
          role + " line height",
        );
        if (role !== "menu")
          assert.equal(
            rendered.fontWeight,
            expected.fontWeight,
            role + " font weight",
          );
      }
    },
  );
  await check(
    "button preview has the real button shape, surface and icon",
    async () => {
      await selectRole("button");
      const button = frame().locator("button.button.type-button");
      await expect(button).toHaveCount(1);
      await expect(button).toHaveCSS(
        "background-color",
        actual.button.backgroundColor,
      );
      await expect(button).toHaveCSS(
        "border-radius",
        actual.button.borderRadius,
      );
      await expect(button.locator(".icon")).toHaveCount(1);
      await admin.locator(".cms-type-sample").screenshot({
        path: "test-results/revision06-real-button-preview.png",
        animations: "disabled",
      });
    },
  );
  await check(
    "menu and footer previews retain their actual selection states and dark surfaces",
    async () => {
      await selectRole("menu");
      const links = frame().locator("nav a");
      await expect(links).toHaveCount(2);
      assert.deepEqual(
        (
          await links.evaluateAll((items) =>
            items.map((e) => getComputedStyle(e).fontWeight),
          )
        ).sort(),
        ["400", "700"],
      );
      await selectRole("footerBrand");
      await expect(frame().locator(".site-footer")).toHaveCSS(
        "background-color",
        "rgb(0, 0, 0)",
      );
      await expect(await sample(admin.locator(".cms-type-sample"))).toHaveCSS(
        "color",
        actual.footerBrand.color,
      );
    },
  );
  await check(
    "style drafts preview responsive sizes and language before any save",
    async () => {
      await selectRole("body");
      await admin.getByLabel("ขนาด Desktop (px)", { exact: true }).fill("21");
      await admin.getByLabel("ขนาด Tablet (px)", { exact: true }).fill("19");
      await admin.getByLabel("ขนาด Mobile (px)", { exact: true }).fill("17");
      for (const [viewport, size] of [
        ["size", 21],
        ["tablet", 19],
        ["mobile", 17],
      ]) {
        await admin
          .getByLabel("ขนาดหน้าจอตัวอย่าง", { exact: true })
          .selectOption(viewport);
        await expect(await sample(admin.locator(".cms-type-sample"))).toHaveCSS(
          "font-size",
          size + "px",
        );
      }
      await admin.getByLabel("ภาษาตัวอย่าง", { exact: true }).selectOption("en");
      await expect(frame().locator("[lang=en]").first()).toHaveCount(1);
      assert.deepEqual(
        (await request("GET", "/admin/documents")).styles,
        original.styles,
      );
    },
  );
  await check(
    "an uploaded font loads inside the draft iframe rather than falling back to CMS typography",
    async () => {
      await admin.getByLabel("ภาษาตัวอย่าง", { exact: true }).selectOption("th");
      await admin
        .getByLabel("ฟอนต์", { exact: true })
        .selectOption(customFont.family);
      const target = await sample(admin.locator(".cms-type-sample"));
      await expect(target).toHaveCSS(
        "font-family",
        new RegExp(customFont.family),
      );
      const result = await target.evaluate(async (element, family) => {
        await element.ownerDocument.fonts.load(
          `20px "${family}"`,
          "ทดสอบฟอนต์ไทย",
        );
        return [...element.ownerDocument.fonts].some(
          (face) =>
            face.family.replaceAll('"', "") === family &&
            face.status === "loaded",
        );
      }, customFont.family);
      assert.equal(result, true);
      await discardDraft();
      assert.deepEqual(
        (await request("GET", "/admin/documents")).styles,
        original.styles,
      );
    },
  );

  await check(
    "the compact text ribbon formats a field and its live preview without saving",
    async () => {
      await openView("home");
      const editor = field("home.intro");
      await expect(editor.locator(".cms-text-ribbon")).toHaveCount(1);
      await editor.getByLabel(/^ฟอนต์ข้อความ /).selectOption(format.font);
      await editor.getByLabel(/^ขนาดข้อความ /).fill(String(format.size));
      for (const label of ["ตัวหนา", "ตัวเอียง", "ขีดเส้นใต้"]) {
        const button = editor.getByRole("button", {
          name: new RegExp("^" + label + " "),
        });
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
      }
      const strike = editor.getByRole("button", { name: /^ขีดฆ่า / });
      await strike.click();
      await expect(strike).toHaveAttribute("aria-pressed", "true");
      await strike.click();
      await expect(strike).toHaveAttribute("aria-pressed", "false");
      await editor.getByLabel(/^สีข้อความ /).fill(format.color);
      await editor.getByLabel(/^สีไฮไลต์ /).fill(format.background);
      await editor.getByRole("button", { name: /^กึ่งกลาง / }).click();
      await advanced("home.intro");
      await editor.getByLabel(/^ระยะบรรทัดข้อความ /).fill(String(format.line));
      await editor
        .getByLabel(/^ระยะตัวอักษรข้อความ /)
        .fill(String(format.spacing));
      const target = await sample(editor);
      await expect(target).toHaveCSS("font-size", "22px");
      await expect(target).toHaveCSS("font-style", "italic");
      await expect(target).toHaveCSS("font-weight", "700");
      await expect(target).toHaveCSS("text-decoration-line", "underline");
      await expect(target).toHaveCSS("color", "rgb(36, 90, 134)");
      await expect(target).toHaveCSS("background-color", "rgb(255, 241, 189)");
      await expect(target).toHaveCSS("text-align", "center");
      assert.deepEqual(
        (await request("GET", "/admin/documents")).home.value,
        original.home.value,
      );
      await editor.screenshot({
        path: "test-results/revision06-word-toolbar.png",
        animations: "disabled",
      });
    },
  );
  await check(
    "saving ribbon formatting changes only this text on the real Thai and English website",
    async () => {
      await saveDocument("home");
      savedIntro = (await request("GET", "/admin/documents")).home.value.intro;
      for (const [key, value] of Object.entries(format))
        assert.equal(savedIntro.format[key], value, key);
      await admin.reload();
      for (const lang of ["th", "en"]) {
        await visitor.goto(runtime.origin + "/");
        await visitorLanguage(lang);
        const intro = visitor.locator(".hero .type-intro");
        await expect(intro).toHaveText(original.home.value.intro[lang]);
        await expect(intro).toHaveCSS("font-size", "22px");
        await expect(intro).toHaveCSS("font-style", "italic");
        await expect(intro).toHaveCSS("text-decoration-line", "underline");
        await expect(intro).toHaveCSS("background-color", "rgb(255, 241, 189)");
        await expect(intro).toHaveCSS("text-align", "center");
      }
      const docs = await request("GET", "/admin/documents");
      assert.deepEqual(docs.styles, original.styles);
      assert.deepEqual(docs.home.value.cards, original.home.value.cards);
    },
  );
  await check(
    "the ribbon remains usable with keyboard and without horizontal overflow on mobile",
    async () => {
      for (const width of [390, 320]) {
        await admin.setViewportSize({ width, height: 1000 });
        const editor = field("home.intro");
        const font = editor.getByLabel(/^ฟอนต์ข้อความ /);
        await font.focus();
        await expect(font).toBeFocused();
        await font.press("Tab");
        await expect(editor.getByLabel(/^ขนาดข้อความ /)).toBeFocused();
        await noOverflow(admin);
      }
      await field("home.intro").screenshot({
        path: "test-results/revision06-word-toolbar-mobile.png",
        animations: "disabled",
      });
      await admin.setViewportSize({ width: 1440, height: 1000 });
    },
  );

  await check(
    "footer logo background is editable in its own page and visible before saving",
    async () => {
      await openView("footer");
      const controls = admin.locator(".cms-logo-background-controls");
      await expect(controls).toHaveCount(1);
      await controls.getByLabel(/^รหัสสีพื้นหลังโลโก้ /).fill("#dbe8f4");
      await controls.getByLabel(/^รหัสสีพื้นหลังโลโก้ /).blur();
      const image = admin.locator(".cms-logo-editor").filter({ has: controls });
      await expect(
        image
          .frameLocator("iframe.cms-public-text-frame")
          .locator(".footer-logo-box"),
      ).toHaveCSS("background-color", "rgb(219, 232, 244)");
      const docs = await request("GET", "/admin/documents");
      assert.equal(docs.global.value.footerLogo.background, undefined);
      await saveDocument("global");
    },
  );
  await check(
    "the real footer preserves its chosen logo background after reload",
    async () => {
      await admin.reload();
      await visitor.goto(runtime.origin + "/");
      await expect(visitor.locator(".footer-logo-box")).toHaveCSS(
        "background-color",
        "rgb(219, 232, 244)",
      );
      const global = (await request("GET", "/admin/documents")).global.value;
      assert.equal(global.footerLogo.background, "#dbe8f4");
      assert.equal(global.logo.background, undefined);
    },
  );
  await check(
    "transparent logo background is explicit and does not remove or recolor the image",
    async () => {
      const controls = admin.locator(".cms-logo-background-controls");
      await controls.getByLabel(/^ไม่มีพื้นหลัง /).check();
      await saveDocument("global");
      await visitor.goto(runtime.origin + "/");
      await expect(visitor.locator(".footer-logo-box")).toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      await expect(visitor.locator(".footer-logo-box img")).toHaveAttribute(
        "src",
        used.url,
      );
    },
  );

  await check(
    "all admin workspaces retain distinct sections, readable hierarchy and responsive layout",
    async () => {
      const views = [
        "dashboard",
        "articles",
        "global",
        "home",
        "about",
        "news",
        "contact",
        "cta",
        "header",
        "footer",
        "adminPresentation",
        "media",
        "styles",
        "icons",
        "contacts",
        "subscribers",
        "system",
        "password",
        "fonts",
      ];
      for (const width of [1440, 390]) {
        await admin.setViewportSize({ width, height: 1000 });
        for (const view of views) {
          await openView(view);
          await noOverflow(admin);
          await expect(
            admin.locator(".cms-page-heading h1, .cms-page-heading h2").first(),
          ).toBeVisible();
        }
      }
      await admin.setViewportSize({ width: 1440, height: 1000 });
      await openView("home");
      const headers = admin.locator(".cms-page-section-header");
      await expect(headers).toHaveCount(4);
      await expect(headers.first()).not.toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      await expect(headers.first().locator("h3")).toHaveCSS(
        "font-weight",
        "700",
      );
      await admin.screenshot({
        path: "test-results/revision06-admin-hierarchy.png",
        fullPage: true,
        animations: "disabled",
      });
    },
  );
  await check(
    "new media and text controls pass automated accessibility checks",
    async () => {
      await openView("media");
      await audit(admin);
      await openView("home");
      await advanced("home.intro");
      await audit(admin);
      await openView("styles");
      await selectRole("button");
      await audit(admin);
    },
  );
  await check(
    "clearing local formatting restores inherited styling without editing text or global styles",
    async () => {
      await openView("home");
      const editor = field("home.intro");
      await editor.getByRole("button", { name: /^ล้างรูปแบบข้อความ / }).click();
      const target = await sample(editor);
      await expect(target).toHaveCSS(
        "font-size",
        original.styles.value.intro.size + "px",
      );
      await expect(target).toHaveCSS("font-style", "normal");
      await expect(target).toHaveCSS("text-decoration-line", "none");
      await saveDocument("home");
      const docs = await request("GET", "/admin/documents");
      assert.equal(docs.home.value.intro.th, original.home.value.intro.th);
      assert.equal(docs.home.value.intro.en, original.home.value.intro.en);
      assert.deepEqual(docs.styles, original.styles);
    },
  );
  await check(
    "media deletions, transparent logos and inherited text survive preview restart",
    async () => {
      await adminContext.close();
      await visitorContext.close();
      await runtime.close();
      runtime = await startPreview({ directory, provisionInitialAdmin: true });
      await connect();
      const docs = await request("GET", "/admin/documents");
      assert.equal(docs.global.value.footerLogo.background, "transparent");
      assert.equal(docs.global.value.logo.url, used.url);
      assert.ok(
        !(await request("GET", "/admin/media")).some((m) =>
          [oldest.id, discard.id].includes(m.id),
        ),
      );
      assert.equal(
        (await visitor.request.get(runtime.origin + used.url)).status(),
        200,
      );
      await visitor.goto(runtime.origin + "/");
      await expect(visitor.locator(".footer-logo-box")).toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      await expect(visitor.locator(".hero .type-intro")).toHaveCSS(
        "font-style",
        "normal",
      );
      assert.deepEqual(pageErrors, []);
    },
  );
  console.log(
    `PASS: ${checks} revision06 browser checks; media deletion and references, real website previews, text ribbon, logo backgrounds, workspace hierarchy, accessibility and restart`,
  );
} catch (error) {
  const location =
    error.stack?.match(/revision06-browser\.js:\d+:\d+/)?.[0] || "unknown";
  if (process.env.GITHUB_ACTIONS)
    console.error(
      `::error title=Revision 06 browser::${checks} checks completed; ${activeCheck}; ${location}`,
    );
  let safe = String(error.stack || error);
  for (const secret of [
    credentials?.password,
    credentials?.email,
    runtime?.token,
  ])
    if (secret) safe = safe.replaceAll(secret, "[REDACTED]");
  console.error(safe);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (runtime) await runtime.close();
  rmSync(directory, { recursive: true, force: true });
}
