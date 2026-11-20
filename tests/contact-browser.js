import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { startPreview } from "../server/preview.js";
import { readInitialCredentials } from "./initial-admin-login-smoke.js";

// This fixture never reads or alters the user's preview database or credentials.
const directory = mkdtempSync(path.join(tmpdir(), "bsign-contact-ui-"));
mkdirSync("test-results", { recursive: true });
let runtime, browser, admin, visitor, adminContext, visitorContext, credentials;
let checks = 0;
const pageErrors = [];
const changed = {
  font: "Noto Sans",
  size: 32,
  tablet: 27,
  mobile: 23,
  weight: 500,
  color: "#123456",
  spacing: 1.2,
  line: 1.8,
};
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
      const value = await response.json();
      if (!response.ok)
        throw Error(
          `${method} ${url}: ${response.status} ${value.error || "UNKNOWN"}`,
        );
      return value;
    },
    { method, url, body },
  );
}
async function saveDocument(key) {
  const response = admin.waitForResponse(
    (r) =>
      r.url().endsWith("/api/admin/documents/" + key) &&
      r.request().method() === "PATCH",
  );
  const save = admin.getByRole("button", {
    name: "บันทึกการเปลี่ยนแปลง",
    exact: true,
  });
  await save.click();
  assert.ok((await response).ok(), `${key} save succeeds`);
  await expect(save).toBeDisabled();
}
async function stylesPanel() {
  await admin
    .locator(".cms-navigation")
    .getByRole("button", { name: "สไตล์เว็บไซต์", exact: true })
    .click();
  await admin
    .getByRole("group", { name: "ชนิดตัวอักษร", exact: true })
    .getByRole("button", { name: "หัวข้อการ์ดเนื้อหา", exact: true })
    .click();
}
async function language(lang) {
  await visitor.locator(`header .languages button[lang="${lang}"]`).click();
  await expect(visitor.locator("html")).toHaveAttribute("lang", lang);
  await visitor.evaluate(() => document.fonts.ready);
}
async function contactStyles(width, lang, role, defaults = false) {
  await visitor.setViewportSize({ width, height: 1000 });
  await visitor.goto(runtime.origin + "/contact");
  await language(lang);
  const headings = visitor.locator(".contact-grid h2.type-panelHeading");
  await expect(headings).toHaveCount(2);
  const allContactHeadings = visitor.locator(
    ".contact-grid .contact-section-title",
  );
  await expect(allContactHeadings).toHaveCount(3);
  for (const heading of await allContactHeadings.all()) {
    await expect(heading).toHaveCSS("text-align", "center");
    for (const edge of ["top", "right", "bottom", "left"]) {
      await expect(heading).toHaveCSS(`border-${edge}-width`, "0px");
      await expect(heading).toHaveCSS(`padding-${edge}`, "0px");
    }
  }
  const size =
    width <= 700 ? role.mobile : width <= 1050 ? role.tablet : role.size;
  for (const heading of await headings.all()) {
    await expect(heading).toHaveCSS("font-size", `${size}px`);
    await expect(heading).toHaveCSS("font-weight", String(role.weight));
    await expect(heading)
      .toHaveCSS(
        "letter-spacing",
        role.spacing ? `${role.spacing}px` : "normal",
      )
      .catch(async (error) => {
        if (role.spacing !== 0) throw error;
        await expect(heading).toHaveCSS("letter-spacing", "0px");
      });
    const metric = await heading.evaluate((el) => ({
      font: getComputedStyle(el).fontFamily,
      line: parseFloat(getComputedStyle(el).lineHeight),
      height: el.getBoundingClientRect().height,
    }));
    assert.ok(
      Math.abs(metric.line - size * role.line) < 0.1,
      `${width}px ${lang}: shared heading line height`,
    );
    if (defaults)
      assert.ok(
        Math.abs(metric.height - size * 1.6) < 1,
        `${width}px ${lang}: borderless heading height ${metric.height}`,
      );
    if (!defaults) {
      await expect(heading).toHaveCSS("color", "rgb(18, 52, 86)");
      assert.ok(
        metric.font.includes(role.font),
        `${width}px ${lang}: shared heading font`,
      );
    }
  }
  const geometry = await visitor.locator(".contact-info").evaluate((card) => {
    const c = card.getBoundingClientRect();
    return Array.from(
      card.querySelectorAll(
        ":scope > .contact-section-title, :scope > .contact-line",
      ),
      (el) => {
        const r = el.getBoundingClientRect();
        return {
          width: r.width,
          center: r.x + r.width / 2,
          cardCenter: c.x + c.width / 2,
        };
      },
    );
  });
  assert.equal(geometry.length, 4);
  assert.ok(
    geometry.every(
      (item) =>
        item.width <= 320.5 && Math.abs(item.center - item.cardCenter) < 1,
    ),
    `${width}px ${lang}: contact information centered and at most 320px`,
  );
  assert.ok(
    await visitor.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    `${width}px ${lang}: no horizontal overflow`,
  );
  checks++;
}
async function otherHeading(route, selector) {
  await visitor.setViewportSize({ width: 1440, height: 1000 });
  await visitor.goto(runtime.origin + route);
  await language("th");
  return visitor
    .locator(selector)
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        font: s.fontFamily,
        size: s.fontSize,
        weight: s.fontWeight,
        color: s.color,
        spacing: s.letterSpacing,
        line: s.lineHeight,
      };
    });
}
try {
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  await connect();
  const original = (await request("GET", "/admin/documents")).styles.value;
  assert.deepEqual(
    [
      original.panelHeading.size,
      original.panelHeading.tablet,
      original.panelHeading.mobile,
      original.panelHeading.line,
    ],
    [24, 22, 20, 1.6],
  );
  checks++;
  const unchangedHome = await otherHeading("/", ".hero h1");
  const unchangedAbout = await otherHeading("/about", ".type-heading");
  for (const width of [1440, 768, 390, 320])
    for (const lang of ["th", "en"])
      await contactStyles(width, lang, original.panelHeading, true);

  await stylesPanel();
  await admin.getByLabel("ฟอนต์", { exact: true }).selectOption(changed.font);
  for (const [label, value] of [
    ["ขนาด Desktop (px)", changed.size],
    ["ขนาด Tablet (px)", changed.tablet],
    ["ขนาด Mobile (px)", changed.mobile],
    ["น้ำหนักตัวอักษร", changed.weight],
    ["ระยะตัวอักษร (px)", changed.spacing],
    ["ระยะบรรทัด (ตัวคูณ)", changed.line],
  ])
    await admin.getByLabel(label, { exact: true }).fill(String(value));
  await admin
    .getByLabel("รหัส HEX panelHeading.color", { exact: true })
    .fill(changed.color);
  const preview = admin.locator(".cms-selected-type-sample .type-panelHeading");
  for (const [viewport, size] of [
    ["size", changed.size],
    ["tablet", changed.tablet],
    ["mobile", changed.mobile],
  ]) {
    await admin
      .getByLabel("ขนาดหน้าจอตัวอย่าง", { exact: true })
      .selectOption(viewport);
    await admin
      .getByLabel("ภาษาตัวอย่าง", { exact: true })
      .selectOption(viewport === "tablet" ? "en" : "th");
    await expect(preview).toHaveCSS("font-size", `${size}px`);
    await expect(preview).toHaveCSS("color", "rgb(18, 52, 86)");
    checks++;
  }
  assert.deepEqual(
    (await request("GET", "/admin/documents")).styles.value.panelHeading,
    original.panelHeading,
    "Preview does not save styles implicitly",
  );
  await contactStyles(1440, "en", original.panelHeading, true);
  checks++;
  await saveDocument("styles");
  const savedStyles = (await request("GET", "/admin/documents")).styles.value;
  assert.deepEqual(savedStyles.panelHeading, {
    ...original.panelHeading,
    ...changed,
  });
  for (const key of Object.keys(original).filter(
    (key) => key !== "panelHeading",
  ))
    assert.deepEqual(
      savedStyles[key],
      original[key],
      `Unrelated style ${key} preserved`,
    );
  checks++;
  for (const width of [1440, 768, 390, 320])
    for (const lang of ["th", "en"])
      await contactStyles(width, lang, savedStyles.panelHeading);
  assert.deepEqual(
    await otherHeading("/", ".hero h1"),
    unchangedHome,
    "Home main heading remains unchanged",
  );
  assert.deepEqual(
    await otherHeading("/about", ".type-heading"),
    unchangedAbout,
    "About section heading remains unchanged",
  );
  checks++;

  await admin
    .locator(".cms-navigation")
    .getByRole("button", { name: "ข้อมูลเว็บไซต์", exact: true })
    .click();
  await admin
    .locator(".cms-website-tabs")
    .getByRole("button", { name: "ติดต่อเรา", exact: true })
    .click();
  const formatted = admin.locator(
    '.cms-bilingual-field[data-field-path="contact.formHeading"]',
  );
  await formatted.locator(".cms-text-format-controls > summary").click();
  await formatted
    .getByLabel(/^รูปแบบข้อความ /)
    .selectOption({ label: "หัวข้อการ์ดเนื้อหา" });
  await saveDocument("contact");
  assert.equal(
    (await request("GET", "/admin/documents")).contact.value.formHeading.format
      .style,
    "panelHeading",
  );
  await contactStyles(390, "en", savedStyles.panelHeading);
  await expect(visitor.locator(".form-card h2")).toHaveAttribute(
    "data-text-style",
    "panelHeading",
  );
  checks++;

  await visitor
    .getByLabel("Full name", { exact: false })
    .fill("Contact Typography Test");
  await visitor
    .getByLabel("Contact email", { exact: false })
    .fill("contact-style@example.test");
  await visitor
    .getByLabel("Message", { exact: false })
    .fill("A message submitted after changing shared contact heading styles.");
  await visitor.locator('input[name="consent"]').check();
  await visitor
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect(visitor.locator(".form-card form [role=status]")).toHaveText(
    "Your message has been saved. Thank you for contacting us.",
  );
  const inbox = await request("GET", "/admin/contacts");
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].value.email, "contact-style@example.test");
  checks++;

  await adminContext.close();
  await visitorContext.close();
  await runtime.close();
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  await connect();
  const afterRestart = await request("GET", "/admin/documents");
  assert.deepEqual(
    afterRestart.styles.value.panelHeading,
    savedStyles.panelHeading,
  );
  assert.equal(
    afterRestart.contact.value.formHeading.format.style,
    "panelHeading",
  );
  assert.equal((await request("GET", "/admin/contacts")).length, 1);
  await contactStyles(768, "th", savedStyles.panelHeading);
  checks++;

  // Reset is a draft preview first; this fixture changed no other style roles.
  await stylesPanel();
  admin.once("dialog", (dialog) => dialog.accept());
  await admin.getByRole("button", { name: "คืนค่าเริ่มต้น", exact: true }).click();
  await admin
    .getByLabel("ขนาดหน้าจอตัวอย่าง", { exact: true })
    .selectOption("size");
  await expect(
    admin.locator(".cms-selected-type-sample .type-panelHeading"),
  ).toHaveCSS("font-size", "24px");
  assert.deepEqual(
    (await request("GET", "/admin/documents")).styles.value.panelHeading,
    savedStyles.panelHeading,
    "Reset remains a draft until saved",
  );
  checks++;
  await saveDocument("styles");
  assert.deepEqual(
    (await request("GET", "/admin/documents")).styles.value,
    original,
    "Reset restores the role and preserves unchanged styles",
  );
  await contactStyles(1440, "th", original.panelHeading, true);
  await contactStyles(390, "en", original.panelHeading, true);
  checks++;
  assert.deepEqual(pageErrors, [], "Unexpected browser errors");
  console.log(
    `PASS: ${checks} contact browser checks; TH/EN responsive proportions, central styles and preview/reset, text-role dropdown, form submission and restart`,
  );
} catch (error) {
  const safe = String(error.stack || error).replaceAll(
    credentials?.password || "\u0000",
    "[REDACTED]",
  );
  if (process.env.GITHUB_ACTIONS)
    console.error(
      "::error title=Contact browser regression::" +
        safe
          .replaceAll("%", "%25")
          .replaceAll("\r", "%0D")
          .replaceAll("\n", "%0A")
          .slice(0, 10000),
    );
  for (const [name, page] of [
    ["admin", admin],
    ["public", visitor],
  ])
    if (page && !page.isClosed())
      await page
        .screenshot({
          path: `test-results/contact-failure-${name}.png`,
          fullPage: true,
          animations: "disabled",
        })
        .catch(() => {});
  console.error(safe);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (runtime) await runtime.close();
  rmSync(directory, { recursive: true, force: true });
}
