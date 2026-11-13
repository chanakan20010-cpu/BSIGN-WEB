import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { startPreview } from "../server/preview.js";
import { readInitialCredentials } from "./initial-admin-login-smoke.js";

// All data and generated credentials belong to this temporary test fixture.
const directory = mkdtempSync(path.join(tmpdir(), "bsign-admin-ux-"));
mkdirSync("test-results", { recursive: true });
let runtime, browser, page;
let checks = 0;
const pageErrors = [],
  accessibility = [];
try {
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  const account = readInitialCredentials(runtime.initialAdmin.file);
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => pageErrors.push(error.message));
  async function shot(name) {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: "test-results/" + name + ".png",
      fullPage: true,
      animations: "disabled",
    });
  }
  async function audit(name) {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    for (const violation of result.violations)
      accessibility.push({
        page: name,
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map((n) => n.target),
      });
    checks++;
  }
  async function noOverflow(name) {
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert.ok(
      metrics.scroll <= metrics.width + 1,
      name + " causes page overflow: " + JSON.stringify(metrics),
    );
    checks++;
  }
  async function navigate(label) {
    const aliases = {
      หน้าแรก: ["ข้อมูลเว็บไซต์", ".cms-website-tabs", "หน้าแรก"],
      จัดการบทความ: ["ข่าวสารและบทความ"],
      รูปภาพและไฟล์: ["คลังรูปภาพและไฟล์"],
      สไตล์ตัวอักษร: ["สไตล์เว็บไซต์", ".cms-design-tabs", "ตัวอักษร"],
      ไอคอน: ["สไตล์เว็บไซต์", ".cms-design-tabs", "ไอคอน"],
      ข้อความติดต่อ: ["กล่องข้อความ"],
      ผู้สมัครรับข่าวสาร: ["ผู้รับข่าวสาร"],
      ข้อมูลระบบ: ["ระบบและการสำรองข้อมูล"],
    };
    const [parent, tabs, child] = aliases[label] || [label];
    const toggle = page.getByRole("button", {
      name: "เปิดเมนูจัดการ",
      exact: true,
    });
    if (
      (await toggle.isVisible()) &&
      (await toggle.getAttribute("aria-expanded")) !== "true"
    )
      await toggle.click();
    await page
      .locator(".cms-navigation")
      .getByRole("button", { name: parent, exact: true })
      .click();
    await expect(page.locator(".cms-main")).not.toHaveAttribute(
      "aria-busy",
      "true",
    );
    if (tabs)
      await page
        .locator(tabs)
        .getByRole("button", { name: child, exact: true })
        .click();
  }
  async function editLanguage(language) {
    await page
      .getByRole("button", {
        name: language === "th" ? "แก้ไขภาษาไทย" : "แก้ไขภาษาอังกฤษ",
        exact: true,
      })
      .click();
  }
  async function request(method, url, body) {
    return page.evaluate(
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
            "Test request failed: " +
              response.status +
              " " +
              (value.error || "UNKNOWN"),
          );
        return value;
      },
      { method, url, body },
    );
  }
  const content = () =>
    page.evaluate(() => fetch("/api/content").then((r) => r.json()));

  await page.goto(runtime.origin + "/admin");
  await page.getByLabel("อีเมล", { exact: true }).waitFor();
  await shot("admin-login");
  await audit("login desktop");
  await noOverflow("login desktop");
  await page.getByLabel("อีเมล", { exact: true }).fill(account.email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "แสดงรหัสผ่าน", exact: true }).click();
  await expect(page.getByLabel("รหัสผ่าน", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "ซ่อนรหัสผ่าน", exact: true }).click();
  await expect(page.getByLabel("รหัสผ่าน", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  checks++;
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page
    .getByRole("heading", { name: "BSIGN TECH · CMS", exact: true })
    .waitFor();
  await page.locator(".cms-metric").first().waitFor();
  const overview = await request("GET", "/admin/overview");
  assert.equal(
    Number(
      await page.locator(".cms-metric").first().locator("strong").textContent(),
    ),
    overview.counts.articles,
  );
  checks++;
  await shot("admin-dashboard");
  await audit("dashboard desktop");

  await page.getByLabel("ค้นหาหมวด", { exact: true }).fill("ไอคอน");
  await expect(page.locator(".cms-nav-button")).toHaveCount(1);
  await page.getByLabel("ค้นหาหมวด", { exact: true }).fill("");
  checks++;
  await navigate("หน้าแรก");
  await editLanguage("th");
  const initialEnglish = (await content()).home.title[0].text.en;
  const homeTitle = page.getByLabel("ไทย", { exact: true }).first();
  await homeTitle.fill("หัวข้อจากตัวแก้ไข UX ใหม่");
  await expect(
    page.getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true }),
  ).toBeEnabled();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .locator(".cms-navigation")
    .getByRole("button", { name: "ข่าวสารและบทความ", exact: true })
    .click();
  await expect(page).toHaveURL(/view=home/);
  await expect(homeTitle).toHaveValue("หัวข้อจากตัวแก้ไข UX ใหม่");
  checks++;
  await page
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  await page.getByText("บันทึกแล้ว", { exact: true }).waitFor();
  assert.equal((await content()).home.title[0].text.th, "หัวข้อจากตัวแก้ไข UX ใหม่");
  assert.equal(
    (await content()).home.title[0].text.en,
    initialEnglish,
    "Saving Thai must retain English content",
  );
  await editLanguage("en");
  await expect(page.getByLabel("ไทย", { exact: true })).toHaveCount(0);
  const englishTitle = page.getByLabel("English", { exact: true }).first();
  await englishTitle.fill("English heading saved through the language tab");
  await editLanguage("th");
  await expect(homeTitle).toHaveValue("หัวข้อจากตัวแก้ไข UX ใหม่");
  await editLanguage("en");
  await expect(englishTitle).toHaveValue(
    "English heading saved through the language tab",
  );
  await page
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  await page.getByText("บันทึกแล้ว", { exact: true }).waitFor();
  const bothLanguages = (await content()).home.title[0].text;
  assert.equal(bothLanguages.th, "หัวข้อจากตัวแก้ไข UX ใหม่");
  assert.equal(
    bothLanguages.en,
    "English heading saved through the language tab",
  );
  await editLanguage("th");
  checks++;
  await shot("admin-home-editor");
  await audit("homepage editor desktop");
  checks++;
  await homeTitle.fill("แบบร่างที่ยังไม่บันทึก");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator(".cms-navigation")
    .getByRole("button", { name: "ข่าวสารและบทความ", exact: true })
    .click();
  await expect(page).toHaveURL(/view=articles/);
  assert.equal((await content()).home.title[0].text.th, "หัวข้อจากตัวแก้ไข UX ใหม่");
  checks++;

  // Real article creation, editing, filtering, pagination and deletion.
  await page.getByRole("button", { name: "เพิ่มบทความ", exact: true }).click();
  const title = "บทความทดสอบประสบการณ์ผู้ดูแล";
  await editLanguage("th");
  await page.getByLabel("ไทย", { exact: true }).nth(0).fill(title);
  await page
    .getByLabel("ไทย", { exact: true })
    .nth(1)
    .fill("คำโปรยสำหรับทดสอบบันทึกผ่านหน้าเว็บ");
  await page
    .getByLabel("ไทย", { exact: true })
    .nth(2)
    .fill("เนื้อหาบทความที่บันทึกจริงจากตัวแก้ไขใหม่");
  await editLanguage("en");
  await expect(page.getByLabel("ไทย", { exact: true })).toHaveCount(0);
  await page
    .getByLabel("English", { exact: true })
    .nth(0)
    .fill("Admin experience test article");
  await page
    .getByLabel("English", { exact: true })
    .nth(1)
    .fill("A saved article excerpt.");
  await page
    .getByLabel("English", { exact: true })
    .nth(2)
    .fill("Article body saved through the redesigned editor.");
  await page
    .getByLabel("ลิงก์บทความ", { exact: false })
    .fill("admin-experience-test");
  await page.getByRole("button", { name: "บันทึกบทความ", exact: true }).click();
  await page.getByText("บันทึกบทความแล้ว", { exact: true }).waitFor();
  const docs = await request("GET", "/admin/documents");
  for (let i = 0; i < 6; i++)
    await request("POST", "/admin/articles", {
      slug: "admin-pagination-" + i,
      title: { th: "รายการทดสอบแบ่งหน้า " + i, en: "Pagination fixture " + i },
      excerpt: { th: "คำโปรยทดสอบ", en: "Fixture excerpt" },
      body: { th: "เนื้อหาจำลองเฉพาะฐานข้อมูลทดสอบ", en: "Temporary fixture body" },
      category: docs.news.value.categories[0].id,
      status: "published",
      publishedAt: new Date(Date.now() - 60000).toISOString(),
      image: { url: "", alt: { th: "", en: "" }, crop: null },
      gallery: [],
    });
  await page.getByRole("button", { name: "รีเฟรช", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "หน้าถัดไป", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "หน้าถัดไป", exact: true }).click();
  await page.getByText(/หน้า 2 \/ 2/).waitFor();
  checks++;
  await page.getByLabel("ค้นหาบทความ", { exact: true }).fill(title);
  await expect(page.locator(".cms-table tbody tr")).toHaveCount(1);
  await page
    .locator(".cms-filter-tabs")
    .getByRole("button", { name: /^ฉบับร่าง/ })
    .click();
  await expect(page.locator(".cms-table tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "แก้ไข " + title, exact: true })
    .click();
  await editLanguage("th");
  await page
    .getByLabel("ไทย", { exact: true })
    .first()
    .fill(title + " แก้ไข");
  await page.getByRole("button", { name: "บันทึกบทความ", exact: true }).click();
  await page.getByText("บันทึกบทความแล้ว", { exact: true }).waitFor();
  await expect(
    page.getByRole("button", { name: "แก้ไข " + title + " แก้ไข", exact: true }),
  ).toBeVisible();
  checks++;
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "ลบ " + title + " แก้ไข", exact: true })
    .click();
  await page.getByText("ลบบทความแล้ว", { exact: true }).waitFor();
  await page.getByLabel("ค้นหาบทความ", { exact: true }).fill("");
  await page
    .locator(".cms-filter-tabs")
    .getByRole("button", { name: /^ทั้งหมด/ })
    .click();
  await shot("admin-articles");
  await audit("articles desktop");
  checks++;

  await navigate("รูปภาพและไฟล์");
  await page.locator("input[type=file]").setInputFiles({
    name: "admin-ux.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert(1)"><script>alert(1)</script><path d="M0 0h24v24H0z"/></svg>',
    ),
  });
  await page
    .getByLabel("แหล่งที่มา / URL", { exact: true })
    .fill("Created by the admin browser test");
  await page
    .getByLabel("สิทธิ์การใช้งาน / เจ้าของ", { exact: true })
    .fill("Temporary test fixture");
  await page
    .getByRole("button", { name: "อัปโหลดและตรวจไฟล์", exact: true })
    .click();
  await page.getByText("อัปโหลดแล้ว", { exact: true }).waitFor();
  const uploaded = (await request("GET", "/admin/media")).find(
    (m) => m.name === "admin-ux.svg",
  );
  assert.ok(uploaded);
  const cleanSvg = await page.evaluate(
    (url) => fetch(url).then((r) => r.text()),
    uploaded.url,
  );
  assert.doesNotMatch(cleanSvg, /<script|onload=/i);
  await page.getByLabel("ค้นหาไฟล์", { exact: true }).fill("admin-ux");
  await expect(page.locator(".cms-media-item")).toHaveCount(1);
  await audit("media desktop");
  checks++;

  await navigate("สไตล์ตัวอักษร");
  const originalSize = (await content()).styles.hero.size;
  await page.getByLabel("ขนาด Desktop (px)", { exact: true }).fill("38");
  await expect(page.locator(".cms-type-sample .type-hero").first()).toHaveCSS(
    "font-size",
    "38px",
  );
  assert.equal(
    (await content()).styles.hero.size,
    originalSize,
    "Preview must not publish style changes",
  );
  await page
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  await page.getByText("บันทึกแล้ว", { exact: true }).waitFor();
  assert.equal((await content()).styles.hero.size, 38);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "คืนค่าเริ่มต้น", exact: true }).click();
  assert.equal(
    (await content()).styles.hero.size,
    38,
    "Reset must remain a draft until saved",
  );
  await page
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  await page.getByText("บันทึกแล้ว", { exact: true }).waitFor();
  assert.equal(
    (await content()).styles.hero.size,
    (await request("GET", "/admin/defaults")).styles.hero.size,
  );
  checks += 2;

  await navigate("ไอคอน");
  await page.getByLabel("คลังไอคอน", { exact: true }).selectOption("Rocket");
  await page
    .getByLabel("สีไอคอน (SVG / ไอคอนสำเร็จรูป)", { exact: true })
    .fill("#234567");
  await expect(page.locator(".cms-icon-sample .icon")).toHaveCSS(
    "color",
    "rgb(35, 69, 103)",
  );
  await page
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  await page.getByText("บันทึกแล้ว", { exact: true }).waitFor();
  assert.equal((await content()).icons.shared.arrow.name, "Rocket");
  assert.equal((await content()).icons.shared.arrow.color, "#234567");
  checks++;

  // Verify representative real content in each responsive view, not only the shell.
  const destinations = [
    "ภาพรวม",
    "หน้าแรก",
    "จัดการบทความ",
    "รูปภาพและไฟล์",
    "สไตล์ตัวอักษร",
    "ไอคอน",
    "ข้อความติดต่อ",
    "ผู้สมัครรับข่าวสาร",
    "ข้อมูลระบบ",
  ];
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const label of destinations) {
      await navigate(label);
      await noOverflow(label + " at " + width);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await navigate("ภาพรวม");
  await shot("admin-mobile");
  await audit("dashboard mobile");
  const toggle = page.getByRole("button", { name: "เปิดเมนูจัดการ", exact: true });
  await toggle.click();
  await expect(
    page.getByRole("button", { name: "ปิดเมนูจัดการ", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "ออกจากระบบ", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "ปิดเมนูจัดการ", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  checks++;
  await navigate("หน้าแรก");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await audit("homepage editor mobile");
  checks++;

  assert.deepEqual(pageErrors, [], "Unexpected browser errors");
  assert.deepEqual(accessibility, [], "Admin accessibility violations");
  console.log(
    "PASS: " +
      checks +
      " admin UX checks; real account, dashboard, edits, CRUD, upload, preview, responsive navigation, keyboard and WCAG A/AA",
  );
} catch (error) {
  if (page && !page.isClosed()) {
    console.error(
      "Admin QA stopped at",
      page.url(),
      "browser errors:",
      JSON.stringify(pageErrors),
    );
    await page.screenshot({
      path: "test-results/admin-failure.png",
      fullPage: true,
      animations: "disabled",
    });
  }
  if (accessibility.length)
    console.error(
      "Accessibility findings so far",
      JSON.stringify(accessibility),
    );
  throw error;
} finally {
  if (browser) await browser.close();
  if (runtime) await runtime.close();
  rmSync(directory, { recursive: true, force: true });
}
