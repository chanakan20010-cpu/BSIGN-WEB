import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { startPreview } from "../server/preview.js";
import { readInitialCredentials } from "./initial-admin-login-smoke.js";
import { adminPresentationDefaults } from "../server/admin-presentation-defaults.js";

// CI owns this temporary data directory and its generated account. Credentials
// stay in memory and are never included in logs or screenshot form values.
const directory = mkdtempSync(path.join(tmpdir(), "bsign-admin-presentation-"));
mkdirSync("test-results", { recursive: true });
let runtime, browser, context, page, account;
let checks = 0;
let accessibilityIds = [];
const pageErrors = [];
const labels = {
  title: "เข้าสู่ระบบทีม {brand}",
  storyTitle: "เรื่องราวใหม่\nสร้างได้ทุกวัน",
  emailLabel: "อีเมลทีมงาน",
  invalidCredentials: "ตรวจบัญชีของ {brand} อีกครั้ง",
  showPasswordLabel: "ดูรหัสผ่านทีมงาน",
  helpTitle: "คำแนะนำสำหรับทีม {company}",
  helpSummary: "วิธีเข้าพื้นที่จัดการของทีม",
  helpInstructions: "สอบถามผู้ดูแลบัญชีของทีม",
  helpRecovery: "ใช้บัญชีและรหัสผ่านปัจจุบันของคุณ",
  storyFooter: "{companyEn} · {year}",
};
async function shot(name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `test-results/admin-presentation-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
async function noOverflow(name) {
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert.ok(
    metrics.scroll <= metrics.width + 1,
    `${name}: ${JSON.stringify(metrics)}`,
  );
}
async function audit() {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  accessibilityIds = result.violations
    .filter((violation) => ["serious", "critical"].includes(violation.impact))
    .map((violation) => violation.id);
  assert.deepEqual(
    result.violations
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) => ({ id: v.id, targets: v.nodes.map((node) => node.target) })),
    [],
  );
}
async function openPage() {
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => pageErrors.push(error.message));
}
async function login(emailLabel = "อีเมล", title = "BSIGN TECH · CMS") {
  await page.goto(runtime.origin + "/admin");
  await page.getByLabel(emailLabel, { exact: true }).fill(account.email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
}
async function documentsRequest(key, patch) {
  return page.evaluate(
    async ({ key, patch }) => {
      const { csrf } = await (await fetch("/api/session")).json();
      const docs = await (await fetch("/api/admin/documents")).json();
      const response = await fetch("/api/admin/documents/" + key, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ revision: docs[key].revision, patch }),
      });
      if (!response.ok)
        throw Error("Fixture document update failed: " + response.status);
      return response.json();
    },
    { key, patch },
  );
}
try {
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  account = readInitialCredentials(runtime.initialAdmin.file);
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  await openPage();
  await page.goto(runtime.origin + "/admin");
  await page
    .getByRole("heading", {
      name: adminPresentationDefaults.title,
      exact: true,
    })
    .waitFor();
  await page.getByLabel("อีเมล", { exact: true }).waitFor();
  await page.getByLabel("รหัสผ่าน", { exact: true }).waitFor();
  await audit();
  checks++;

  await login();
  await page
    .locator(".cms-navigation")
    .getByRole("button", { name: "หน้าเข้าสู่ระบบ", exact: true })
    .click();
  await expect(
    page.locator('[data-field-path^="adminPresentation."]'),
  ).toHaveCount(Object.keys(adminPresentationDefaults).length);
  for (const [key, value] of Object.entries(labels)) {
    await page
      .locator(`[data-field-path="adminPresentation.${key}"]`)
      .locator("input, textarea")
      .fill(value);
  }
  await expect(
    page.locator(".cms-login-preview .cms-auth-heading h2"),
  ).toHaveText("เข้าสู่ระบบทีม BSIGN TECH");
  await expect(
    page.locator(".cms-login-preview .cms-auth-story h1"),
  ).toHaveText(labels.storyTitle);
  await expect(page.locator(".cms-login-preview .cms-auth-note")).toContainText(
    "คำแนะนำสำหรับทีม บริษัท บีไซน์ เทค จำกัด",
  );
  await page.getByRole("button", { name: "ข้อผิดพลาด", exact: true }).click();
  await expect(page.locator(".cms-login-preview .cms-status")).toHaveText(
    "ตรวจบัญชีของ BSIGN TECH อีกครั้ง",
  );
  await page.getByRole("button", { name: "กำลังเข้าสู่ระบบ", exact: true }).click();
  await expect(
    page.locator(".cms-login-preview .cms-login-submit"),
  ).toBeDisabled();
  await expect(page.locator(".cms-login-preview .cms-login-submit")).toHaveText(
    adminPresentationDefaults.pendingLabel,
  );
  await page.getByRole("button", { name: "ปกติ", exact: true }).click();
  checks++;

  const presentationSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/admin/documents/adminPresentation") &&
      response.request().method() === "PATCH",
  );
  await page
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  assert.equal((await presentationSaved).status(), 200);
  await expect(
    page.getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.locator('[data-field-path="adminPresentation.storyTitle"] textarea'),
  ).toHaveValue(labels.storyTitle);
  checks++;

  // Imported documents can retain future/private keys. The editor submits
  // known display fields while the server keeps these stored extras private.
  const importedExtra = {
    note: "import-only private fixture",
    preserved: true,
  };
  const imported = JSON.parse(
    runtime.db
      .prepare("SELECT value FROM documents WHERE key='adminPresentation'")
      .get().value,
  );
  runtime.db
    .prepare(
      "UPDATE documents SET value=?,revision=revision+1 WHERE key='adminPresentation'",
    )
    .run(JSON.stringify({ ...imported, futurePrivateNote: importedExtra }));
  await page.reload();
  const importedTagline = "บันทึกข้อความต้อนรับหลังนำเข้าข้อมูล";
  await page
    .locator('[data-field-path="adminPresentation.storyTagline"] input')
    .fill(importedTagline);
  const importedSave = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/admin/documents/adminPresentation") &&
      response.request().method() === "PATCH",
  );
  await page
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  assert.equal((await importedSave).status(), 200);
  const storedImport = JSON.parse(
    runtime.db
      .prepare("SELECT value FROM documents WHERE key='adminPresentation'")
      .get().value,
  );
  assert.equal(storedImport.storyTagline, importedTagline);
  assert.deepEqual(storedImport.futurePrivateNote, importedExtra);
  const importedResponses = await page.evaluate(async () => ({
    privateDocs: await (await fetch("/api/admin/documents")).json(),
    publicContent: await (await fetch("/api/content")).json(),
  }));
  assert.deepEqual(
    importedResponses.privateDocs.adminPresentation.value.futurePrivateNote,
    importedExtra,
  );
  assert.equal(
    importedResponses.publicContent.adminPresentation.storyTagline,
    importedTagline,
  );
  assert.equal(
    Object.hasOwn(
      importedResponses.publicContent.adminPresentation,
      "futurePrivateNote",
    ),
    false,
  );
  assert.equal(
    JSON.stringify(importedResponses.publicContent).includes(
      importedExtra.note,
    ),
    false,
  );
  checks++;

  const logo = await page.evaluate(async () => {
    const { csrf } = await (await fetch("/api/session")).json();
    const form = new FormData();
    form.set(
      "file",
      new File(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="16" fill="#126745"/></svg>',
        ],
        "identity-fixture.svg",
        { type: "image/svg+xml" },
      ),
    );
    form.set("source", "Original browser test fixture");
    form.set("license", "CC0");
    const response = await fetch("/api/admin/media", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
      body: form,
    });
    if (!response.ok) throw Error("Fixture upload failed: " + response.status);
    return response.json();
  });
  await documentsRequest("global", {
    brand: { th: "แบรนด์ทดสอบ", en: "OTHER EN BRAND" },
    company: { th: "บริษัททดสอบ", en: "Identity Company" },
    logo: {
      url: logo.url,
      alt: { th: "โลโก้ทดสอบ", en: "Identity test logo" },
      crop: [0, 0, 80, 80, 80, 80],
    },
  });
  await page.reload();
  await page.locator('[data-field-path="adminPresentation.title"]').waitFor();
  await expect(page.locator(".cms-sidebar .cms-brand-wordmark b")).toHaveText(
    "แบรนด์ทดสอบ",
  );
  await expect(
    page.locator(".cms-sidebar .cms-brand-wordmark small"),
  ).toHaveText("บริษัททดสอบ");
  await expect(
    page.locator(".cms-sidebar .cms-brand-logo image"),
  ).toHaveAttribute("href", logo.url);
  assert.equal(await page.locator(".cms-brand-mark").count(), 0);
  await expect(
    page.locator(".cms-login-preview .cms-auth-story-footer"),
  ).toHaveText(`Identity Company · ${new Date().getFullYear()}`);
  await expect(page.locator(".cms-login-preview .cms-auth-note")).toContainText(
    "คำแนะนำสำหรับทีม บริษัททดสอบ",
  );
  checks++;

  await audit();
  await noOverflow("editor desktop");
  await shot("editor-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow("editor mobile");
  await shot("editor-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  checks++;

  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await page
    .getByRole("heading", { name: "เข้าสู่ระบบทีม แบรนด์ทดสอบ", exact: true })
    .waitFor();
  await page.getByLabel("อีเมลทีมงาน", { exact: true }).fill(account.email);
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill("incorrect-fixture-password");
  await page.getByRole("button", { name: "ดูรหัสผ่านทีมงาน", exact: true }).click();
  await expect(page.getByLabel("รหัสผ่าน", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", {
      name: adminPresentationDefaults.hidePasswordLabel,
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "ตรวจบัญชีของ แบรนด์ทดสอบ อีกครั้ง",
  );
  await page.getByLabel("อีเมลทีมงาน", { exact: true }).fill("");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("");
  await noOverflow("login desktop");
  await audit();
  await shot("login-desktop");
  checks++;

  await page.evaluate(() => localStorage.setItem("bsign-lang", "en"));
  await page.reload();
  await page
    .getByRole("heading", { name: "เข้าสู่ระบบทีม แบรนด์ทดสอบ", exact: true })
    .waitFor();
  await page.getByLabel("อีเมลทีมงาน", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow("login mobile");
  await shot("login-mobile");
  checks++;

  await page.setViewportSize({ width: 1440, height: 1000 });
  await login("อีเมลทีมงาน", "แบรนด์ทดสอบ · CMS");
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await page
    .getByRole("heading", { name: "เข้าสู่ระบบทีม แบรนด์ทดสอบ", exact: true })
    .waitFor();
  await page.goto(runtime.origin + "/setup?recover=1#" + runtime.token);
  await page
    .getByRole("heading", { name: "ตั้งรหัสผ่านแอดมินใหม่", exact: true })
    .waitFor();
  await expect(page.locator(".cms-auth-description")).toContainText(
    "เลือกบัญชีในเครื่องนี้แล้วตั้งรหัสผ่านใหม่",
  );
  checks++;

  await context.close();
  await runtime.close();
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  await openPage();
  await page.goto(runtime.origin + "/admin");
  await page
    .getByRole("heading", { name: "เข้าสู่ระบบทีม แบรนด์ทดสอบ", exact: true })
    .waitFor();
  await expect(page.locator(".cms-auth-story h1")).toHaveText(
    labels.storyTitle,
  );
  await expect(
    page.locator(".cms-auth-story .cms-brand-logo image"),
  ).toHaveAttribute("href", logo.url);
  await login("อีเมลทีมงาน", "แบรนด์ทดสอบ · CMS");
  await page
    .locator(".cms-navigation")
    .getByRole("button", { name: "หน้าเข้าสู่ระบบ", exact: true })
    .click();
  await expect(
    page.locator('[data-field-path="adminPresentation.helpTitle"] textarea'),
  ).toHaveValue(labels.helpTitle);
  checks++;

  await documentsRequest("maintenance", { enabled: true });
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await page.reload();
  await page
    .getByRole("heading", {
      name: "เข้าสู่ระบบทีม แบรนด์ทดสอบ",
      exact: true,
    })
    .waitFor();
  await expect(
    page.locator(".cms-auth-story .cms-brand-wordmark b"),
  ).toHaveText("แบรนด์ทดสอบ");
  await expect(
    page.locator(".cms-auth-story .cms-brand-logo image"),
  ).toHaveAttribute("href", logo.url);
  await page.getByLabel("อีเมลทีมงาน", { exact: true }).waitFor();
  assert.deepEqual(pageErrors, []);
  checks++;
  console.log(
    `PASS: ${checks} admin identity/login checks; editable copy, saved preview, imported private fields preserved without public exposure, real logo, token expansion, configured errors, Thai labels, desktop/mobile, setup isolation and persistence`,
  );
} catch (error) {
  // Public CI diagnostics contain only checkpoint counts, this test's source
  // location and fixed axe rule IDs. Do not expose form values or assertions.
  const location =
    error.stack?.match(/admin-presentation-browser\.js:\d+:\d+/)?.[0] ||
    "unknown";
  const rules =
    accessibilityIds.filter((id) => /^[a-z0-9-]+$/.test(id)).join(",") ||
    "none";
  console.error(
    `::error title=Admin identity browser::${checks} checks completed; ${location}; accessibility rules ${rules}`,
  );
  throw error;
} finally {
  if (browser) await browser.close();
  if (runtime) await runtime.close();
  rmSync(directory, { recursive: true, force: true });
}
