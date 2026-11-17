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
let runtime, browser, page, account;
let checks = 0;
const pageErrors = [],
  accessibility = [];
try {
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  account = readInitialCredentials(runtime.initialAdmin.file);
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
      ติดต่อเรา: ["ข้อมูลเว็บไซต์", ".cms-website-tabs", "ติดต่อเรา"],
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
  async function revealControl(control) {
    await control.waitFor({ state: "attached" });
    const parents = await control.locator("xpath=ancestor::details").all();
    for (const detail of parents) {
      if ((await detail.getAttribute("open")) === null)
        await detail.locator(":scope > summary").click();
    }
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

  await page.getByLabel("ค้นหาหมวด", { exact: true }).fill("หน้าแรก");
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
  // Simulate a slow save while the user continues typing. The successful
  // response must not replace newer text that has not been submitted yet.
  const submittedTitle = "หัวข้อก่อนบันทึกระหว่างรอ";
  await homeTitle.fill(submittedTitle);
  let releaseSave;
  const saveGate = new Promise((resolve) => {
    releaseSave = resolve;
  });
  const delayedPatch = async (route) => {
    if (route.request().method() === "PATCH") await saveGate;
    await route.continue();
  };
  await page.route("**/api/admin/documents/home", delayedPatch);
  try {
    const requested = page.waitForRequest(
      (request) =>
        request.url().endsWith("/api/admin/documents/home") &&
        request.method() === "PATCH",
    );
    await page
      .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
      .click();
    await requested;
    await homeTitle.fill("หัวข้อจากตัวแก้ไข UX ใหม่");
    releaseSave();
    await page.getByText("บันทึกแล้ว", { exact: true }).waitFor();
    assert.equal((await content()).home.title[0].text.th, submittedTitle);
    await expect(homeTitle).toHaveValue("หัวข้อจากตัวแก้ไข UX ใหม่");
    await expect(
      page.getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true }),
    ).toBeEnabled();
  } finally {
    releaseSave();
    await page.unroute("**/api/admin/documents/home", delayedPatch);
  }
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
    .locator(".cms-paragraph-block")
    .first()
    .getByLabel("ไทย", { exact: true })
    .first()
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
    .locator(".cms-paragraph-block")
    .first()
    .getByLabel("English", { exact: true })
    .first()
    .fill("Article body saved through the redesigned editor.");
  await page
    .getByLabel("ลิงก์บทความ", { exact: false })
    .fill("admin-experience-test");
  // Language and publication controls share one panel. They must remain usable
  // beside long article content on desktop and as a compact panel on mobile.
  const settingsPanel = page.locator("aside.cms-article-settings");
  const languageBar = settingsPanel.locator(".cms-article-language-bar");
  const publishing = settingsPanel.locator("details.cms-article-publishing");
  await expect(page.locator(".cms-article-language-bar")).toHaveCount(1);
  await expect(languageBar).toHaveCount(1);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width > 1100 ? 720 : 1000 });
    await expect(publishing).toHaveJSProperty("open", width > 1100);
    if (width <= 1100) {
      const publicationToggle = publishing.locator(":scope > summary");
      await publicationToggle.click();
      await expect(publishing).toHaveJSProperty("open", true);
      await expect(
        publishing.getByLabel("ลิงก์บทความ", { exact: false }),
      ).toBeVisible();
      const save = publishing.getByRole("button", {
        name: "บันทึกบทความ",
        exact: true,
      });
      await save.scrollIntoViewIfNeeded();
      await expect(save).toBeInViewport({ ratio: 1 });
      const thaiSwitch = languageBar.getByRole("button", {
        name: "แก้ไขภาษาไทย",
        exact: true,
      });
      await expect(thaiSwitch).toBeInViewport({ ratio: 1 });
      await thaiSwitch.click();
      await expect(thaiSwitch).toHaveAttribute("aria-pressed", "true");
      await publicationToggle.click();
      await expect(publishing).toHaveJSProperty("open", false);
      checks++;
    }
    await publishing.evaluate((el) => (el.scrollTop = 0));
    for (const target of ["#article-content", "#article-gallery"]) {
      await page
        .locator(target)
        .evaluate((el) => el.scrollIntoView({ block: "start" }));
      const bar = languageBar;
      await expect
        .poll(async () => Math.round((await settingsPanel.boundingBox()).y))
        .toBe(12);
      for (const language of ["th", "en"]) {
        const button = bar.getByRole("button", {
          name: language === "th" ? "แก้ไขภาษาไทย" : "แก้ไขภาษาอังกฤษ",
          exact: true,
        });
        await expect(button).toBeInViewport({ ratio: 1 });
        assert.ok(
          await button.evaluate((el) => {
            const box = el.getBoundingClientRect();
            return el.contains(
              document.elementFromPoint(
                box.x + box.width / 2,
                box.y + box.height / 2,
              ),
            );
          }),
          "Language switch must not be covered by another panel",
        );
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        const body = page
          .locator(".cms-paragraph-block")
          .first()
          .getByLabel(language === "th" ? "ไทย" : "English", { exact: true })
          .first();
        await expect(body).toHaveValue(
          language === "th"
            ? "เนื้อหาบทความที่บันทึกจริงจากตัวแก้ไขใหม่"
            : "Article body saved through the redesigned editor.",
        );
      }
      assert.equal(
        await settingsPanel.evaluate((el) => getComputedStyle(el).position),
        "sticky",
        "Combined language/publication panel must stay visible while scrolling",
      );
      checks++;
    }
    if (width > 1100) {
      const save = publishing.getByRole("button", {
        name: "บันทึกบทความ",
        exact: true,
      });
      await save.scrollIntoViewIfNeeded();
      await expect(save).toBeInViewport({ ratio: 1 });
      await expect(languageBar).toBeInViewport({ ratio: 1 });
      const thaiSwitch = languageBar.getByRole("button", {
        name: "แก้ไขภาษาไทย",
        exact: true,
      });
      await thaiSwitch.click();
      await expect(thaiSwitch).toHaveAttribute("aria-pressed", "true");
      checks++;
    }
    if (width <= 900) {
      await page
        .getByRole("button", { name: "เปิดเมนูจัดการ", exact: true })
        .click();
      const sidebar = page.locator(".cms-sidebar");
      await expect(sidebar).toHaveAttribute("aria-modal", "true");
      const close = page.getByRole("button", {
        name: "ปิดเมนูจัดการ",
        exact: true,
      });
      await expect
        .poll(
          () =>
            close.evaluate((el) => {
              const r = el.getBoundingClientRect();
              return el.contains(
                document.elementFromPoint(
                  r.x + r.width / 2,
                  r.y + r.height / 2,
                ),
              );
            }),
          {
            message:
              "Mobile navigation must remain above the sticky language toolbar",
          },
        )
        .toBe(true);
      await page.keyboard.press("Escape");
      checks++;
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(publishing).toHaveJSProperty("open", true);
  await audit("article editor desktop with language and publishing controls");
  await page.getByRole("button", { name: "บันทึกบทความ", exact: true }).click();
  await page.getByText("บันทึกบทความแล้ว", { exact: true }).waitFor();
  const bilingualArticle = (await request("GET", "/admin/articles")).find(
    (a) => a.slug === "admin-experience-test",
  );
  assert.equal(bilingualArticle.title.th, title);
  assert.equal(bilingualArticle.title.en, "Admin experience test article");
  assert.equal(
    bilingualArticle.blocks[0].text.th,
    "เนื้อหาบทความที่บันทึกจริงจากตัวแก้ไขใหม่",
  );
  assert.equal(
    bilingualArticle.blocks[0].text.en,
    "Article body saved through the redesigned editor.",
  );
  checks++;
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

  await navigate("หน้าแรก");
  const inlineIcon = page.locator(".cms-inline-icon-editor").filter({
    has: page.getByLabel("รหัสสีไอคอน home.hero.arrow", { exact: true }),
  });
  await revealControl(inlineIcon.locator("select").first());
  await inlineIcon.getByRole("combobox").first().selectOption("Rocket");
  await inlineIcon
    .getByLabel("รหัสสีไอคอน home.hero.arrow", { exact: true })
    .fill("#234567");
  await expect(inlineIcon.locator(".cms-icon-sample .icon")).toHaveCSS(
    "color",
    "rgb(35, 69, 103)",
  );
  await page
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  await page.getByText("บันทึกแล้ว", { exact: true }).waitFor();
  assert.equal(
    (await content()).icons.overrides["home.hero.arrow"].name,
    "Rocket",
  );
  assert.equal(
    (await content()).icons.overrides["home.hero.arrow"].color,
    "#234567",
  );
  checks++;

  // Verify representative real content in each responsive view, not only the shell.
  const destinations = [
    "ภาพรวม",
    "หน้าแรก",
    "จัดการบทความ",
    "รูปภาพและไฟล์",
    "สไตล์ตัวอักษร",
    "ติดต่อเรา",
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
  if (process.env.GITHUB_ACTIONS) {
    let message = error.message.split("Call log:")[0].slice(0, 1800);
    for (const secret of Object.values(account || {}))
      if (secret) message = message.replaceAll(secret, "[REDACTED]");
    const location = error.stack?.match(
      /tests[\\/]admin-browser\.js:\d+:\d+/,
    )?.[0];
    message = `${message}\n${location || ""}`
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");
    console.error(
      `::error title=Admin UX (${checks} checks completed)::${message}`,
    );
  }
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
