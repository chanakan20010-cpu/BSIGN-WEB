import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { startPreview } from "../server/preview.js";
import { readInitialCredentials } from "./initial-admin-login-smoke.js";

const directory = mkdtempSync(path.join(tmpdir(), "bsign-revision02-ui-"));
mkdirSync("test-results", { recursive: true });
let runtime, browser, adminContext, visitorContext, admin, visitor;
const pageErrors = [];
let checks = 0;
const cardTitle = "บริการที่มีรูปแบบและไอคอนประจำการ์ด";
const articleTitle = "บทความจัดรูปแบบข้อความเพื่อการทดสอบ";
const paragraphText =
  "ข้อความย่อหน้าที่ผู้ดูแลเลือกรูปแบบและจัดแนวได้จริง โดยใช้สไตล์ส่วนกลางร่วมกันทุกภาษาและทุกขนาดหน้าจอ";
const fixture = (name, color = "#448866") => ({
  name,
  mimeType: "image/svg+xml",
  buffer: Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><path fill="${color}" d="M0 0h160v90H0z"/></svg>`,
  ),
});
async function connectBrowserPages() {
  adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  visitorContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  admin = await adminContext.newPage();
  visitor = await visitorContext.newPage();
  for (const page of [admin, visitor]) {
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => pageErrors.push(error.message));
  }
}
async function login() {
  const account = readInitialCredentials(runtime.initialAdmin.file);
  await admin.goto(runtime.origin + "/admin");
  await admin.getByLabel("อีเมล", { exact: true }).fill(account.email);
  await admin.getByLabel("รหัสผ่าน", { exact: true }).fill(account.password);
  await admin.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await admin
    .getByRole("heading", { name: "BSIGN TECH · CMS", exact: true })
    .waitFor();
  await admin.locator(".cms-maintenance-controls").waitFor();
}
async function navigate(label, tab) {
  const toggle = admin.getByRole("button", {
    name: "เปิดเมนูจัดการ",
    exact: true,
  });
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute("aria-expanded")) !== "true"
  )
    await toggle.click();
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
async function content() {
  return visitor.evaluate(() => fetch("/api/content").then((r) => r.json()));
}
async function reveal(control) {
  await control.waitFor({ state: "attached" });
  const details = await control.locator("xpath=ancestor::details").all();
  for (const detail of details)
    if ((await detail.getAttribute("open")) === null)
      await detail.locator(":scope > summary").click();
}
function field(path) {
  return admin.locator(`.cms-bilingual-field[data-field-path="${path}"]`);
}
async function editText(path, text, lang = "ไทย") {
  const input = field(path).getByLabel(lang, { exact: true }).first();
  await reveal(input);
  await input.fill(text);
}
async function savePage() {
  await admin
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  await admin.getByText("บันทึกแล้ว", { exact: true }).waitFor();
  await expect(
    admin.getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true }),
  ).toBeDisabled();
}
async function setFormat(path, style, align) {
  const block = field(path);
  const styleSelect = block.getByLabel(/^รูปแบบข้อความ /);
  await reveal(styleSelect);
  if (style !== undefined) await styleSelect.selectOption(style);
  if (align !== undefined)
    await block.getByLabel(/^การจัดแนวข้อความ /).selectOption(align);
}
async function audit(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
    [],
    label + " accessibility",
  );
  checks++;
}
async function overflow(page, label) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    label + " overflows",
  );
  checks++;
}
async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `test-results/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
try {
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  await connectBrowserPages();
  await login();
  await navigate("ข้อมูลเว็บไซต์", "หน้าแรก");
  await expect(admin.locator(".cms-section-nav")).toHaveCount(0);
  const sections = admin.locator(".cms-page-section");
  assert.ok(
    (await sections.count()) >= 4,
    "Homepage must keep its ordered content sections visible",
  );
  checks++;

  // Edit the labels displayed to the administrator, not just the public text.
  const services = sections.nth(1);
  await services.locator(".cms-section-name-editor > summary").click();
  await services
    .getByLabel("ชื่อส่วนในหลังบ้าน บริการของเรา", { exact: true })
    .fill("โซลูชันและบริการขององค์กร");
  await services
    .getByLabel("คำอธิบายส่วนในหลังบ้าน บริการของเรา", { exact: true })
    .fill("จัดการชุดบริการและไอคอนแต่ละการ์ด");
  await savePage();
  let docs = await request("GET", "/admin/documents");
  assert.equal(
    docs.home.value.editorLabels.sections["home.services"].title,
    "โซลูชันและบริการขององค์กร",
  );
  checks++;

  // A card owns its title format and icon. Reordering it must carry both settings.
  const serviceIntro = admin.locator('[data-field-path="home.services"]');
  await serviceIntro
    .getByRole("button", { name: "แก้ไขชื่อ แนะนำบริการ", exact: true })
    .click();
  await serviceIntro
    .getByLabel("ชื่อที่แสดง แนะนำบริการ", { exact: true })
    .fill("รายละเอียดบริการสำหรับผู้ดูแล");
  await serviceIntro
    .getByRole("button", { name: "เสร็จสิ้นการแก้ชื่อ แนะนำบริการ", exact: true })
    .click();
  await editText("home.cards.0.title", cardTitle);
  await setFormat("home.cards.0.title", "heading", "center");
  const serviceCards = admin.locator(
    '[data-field-path="home.cards"] > .cms-array-item',
  );
  const firstCard = serviceCards.first();
  await firstCard
    .getByRole("button", { name: "แก้ไขชื่อ การ์ด 1", exact: true })
    .click();
  await firstCard
    .getByLabel("ชื่อที่แสดง การ์ด 1", { exact: true })
    .fill("บริการเฉพาะธุรกิจ");
  await firstCard
    .getByRole("button", { name: "เสร็จสิ้นการแก้ชื่อ การ์ด 1", exact: true })
    .click();
  const cardIcon = firstCard.locator(".cms-inline-icon-editor").first();
  const iconSelect = cardIcon.getByRole("combobox").first();
  await reveal(cardIcon.locator("select").first());
  await iconSelect.selectOption("Brain");
  const colorInput = cardIcon.locator('input[type="text"]').first();
  await colorInput.fill("#2468ac");
  const preview = cardIcon.locator(".cms-icon-sample");
  const bounds = await preview.evaluate((frame) => {
    const f = frame.getBoundingClientRect(),
      i = frame.querySelector(".icon").getBoundingClientRect();
    return {
      frame: [f.left, f.top, f.right, f.bottom],
      icon: [i.left, i.top, i.right, i.bottom],
      delta: [
        (f.left + f.right - i.left - i.right) / 2,
        (f.top + f.bottom - i.top - i.bottom) / 2,
      ],
    };
  });
  assert.ok(
    bounds.icon[0] >= bounds.frame[0] &&
      bounds.icon[1] >= bounds.frame[1] &&
      bounds.icon[2] <= bounds.frame[2] &&
      bounds.icon[3] <= bounds.frame[3],
    "Icon preview escapes frame",
  );
  assert.ok(
    bounds.delta.every((n) => Math.abs(n) <= 1),
    "Icon preview is not centered",
  );
  await firstCard
    .getByRole("button", { name: "ย้ายรายการ 1 ลง", exact: true })
    .click();
  await savePage();
  docs = await request("GET", "/admin/documents");
  assert.equal(docs.home.value.cards[1].title.th, cardTitle);
  assert.equal(docs.home.value.cards[1].icon.name, "Brain");
  assert.equal(docs.home.value.cards[1].editorLabel, "บริการเฉพาะธุรกิจ");
  assert.equal(
    docs.home.value.editorLabels.fields["home.services"],
    "รายละเอียดบริการสำหรับผู้ดูแล",
  );
  assert.equal(docs.home.value.cards[1].icon.color, "#2468ac");
  assert.notEqual(
    docs.home.value.cards[0].icon.color,
    "#2468ac",
    "Unrelated card icon changed",
  );
  assert.deepEqual(docs.home.value.cards[1].title.format, {
    style: "heading",
    align: "center",
  });
  checks += 5;

  await visitor.goto(runtime.origin);
  const publicCard = visitor.locator(".service").nth(1);
  await expect(publicCard.locator(".icon").first()).toHaveCSS(
    "color",
    "rgb(36, 104, 172)",
  );
  await expect(publicCard.getByText(cardTitle, { exact: true })).toHaveCSS(
    "text-align",
    "center",
  );
  const styles = docs.styles;
  await request("PATCH", "/admin/documents/styles", {
    revision: styles.revision,
    patch: { heading: { size: 34, tablet: 28, mobile: 22 } },
  });
  for (const [width, size] of [
    [1440, 34],
    [768, 28],
    [390, 22],
  ]) {
    await visitor.setViewportSize({ width, height: 1000 });
    await visitor.reload();
    await expect(visitor.getByText(cardTitle, { exact: true })).toHaveCSS(
      "font-size",
      size + "px",
    );
    await overflow(visitor, "formatted homepage " + width);
    checks++;
  }
  await visitor.setViewportSize({ width: 1440, height: 1000 });

  // The same editing approach also applies to About and News, including both
  // independently owned icons on a value card.
  await navigate("ข้อมูลเว็บไซต์", "เกี่ยวกับเรา");
  await expect(admin.locator(".cms-section-nav")).toHaveCount(0);
  assert.ok((await admin.locator(".cms-page-section").count()) >= 4);
  await editText("about.cards.0.title", "คุณค่าที่ปรับรูปแบบได้จริง");
  await setFormat("about.cards.0.title", "subheading", "right");
  const valueCard = admin.locator('[data-field-path="about.cards.0"]');
  const valueIcons = valueCard.locator(".cms-inline-icon-editor");
  await expect(valueIcons).toHaveCount(2);
  await reveal(valueIcons.first().locator("select").first());
  await valueIcons
    .first()
    .getByRole("combobox")
    .first()
    .selectOption("Handshake");
  await valueIcons
    .first()
    .getByLabel(/^รหัสสีไอคอน /)
    .fill("#7a3b50");
  await valueIcons
    .nth(1)
    .getByLabel(/^รหัสสีไอคอน /)
    .fill("#1a64a4");
  await savePage();
  await visitor.goto(runtime.origin + "/about");
  await expect(
    visitor.locator(".value-card").first().locator(".value-top .icon"),
  ).toHaveCSS("color", "rgb(122, 59, 80)");
  await expect(
    visitor.locator(".value-card").first().locator(".value-foot .icon"),
  ).toHaveCSS("color", "rgb(26, 100, 164)");
  await expect(
    visitor.getByText("คุณค่าที่ปรับรูปแบบได้จริง", { exact: true }),
  ).toHaveCSS("text-align", "right");
  checks += 2;
  await navigate("ข้อมูลเว็บไซต์", "ข่าวสาร");
  await expect(admin.locator(".cms-section-nav")).toHaveCount(0);
  await editText("news.section.heading", "ข่าวสารที่กำหนดรูปแบบโดยผู้ดูแล");
  await setFormat("news.section.heading", "heading", "center");
  await savePage();
  await visitor.goto(runtime.origin + "/news");
  await expect(
    visitor.getByText("ข่าวสารที่กำหนดรูปแบบโดยผู้ดูแล", { exact: true }),
  ).toHaveCSS("font-size", "34px");
  await expect(
    visitor.getByText("ข่าวสารที่กำหนดรูปแบบโดยผู้ดูแล", { exact: true }),
  ).toHaveCSS("text-align", "center");
  checks++;

  // Explicit text style and all five alignments are saved through the article UI.
  await navigate("ข่าวสารและบทความ");
  await admin.getByRole("button", { name: "เพิ่มบทความ", exact: true }).click();
  await expect(admin.locator("#article-info")).toBeVisible();
  await expect(admin.locator("#article-info .cms-image-editor")).toHaveCount(1);
  await expect(admin.locator("#article-gallery")).toBeVisible();
  await editText("articles.title", articleTitle);
  await editText("articles.excerpt", "คำโปรยของบทความที่มีรูปแบบข้อความ");
  await setFormat("articles.title", "heading", "left");
  await editText("articles.blocks.0.body", paragraphText);
  await setFormat("articles.blocks.0.body", "intro", "right");
  await admin
    .getByLabel("ลิงก์บทความ", { exact: false })
    .fill("revision02-formatted-article");
  await admin.getByLabel(/สถานะบทความ/).selectOption("published");
  await admin.getByRole("button", { name: "บันทึกบทความ", exact: true }).click();
  await admin.getByText("บันทึกบทความแล้ว", { exact: true }).waitFor();
  let article = (await request("GET", "/admin/articles")).find(
    (a) => a.slug === "revision02-formatted-article",
  );
  assert.deepEqual(article.blocks[0].text.format, {
    style: "intro",
    align: "right",
  });
  checks += 2;
  for (const alignment of [
    "left",
    "right",
    "center",
    "distributed",
    "justify",
  ]) {
    await admin
      .getByRole("button", { name: "แก้ไข " + articleTitle, exact: true })
      .click();
    await setFormat("articles.blocks.0.body", "intro", alignment);
    await admin
      .getByRole("button", { name: "บันทึกบทความ", exact: true })
      .click();
    await admin.getByText("บันทึกบทความแล้ว", { exact: true }).waitFor();
    await visitor.goto(runtime.origin + "/news/revision02-formatted-article");
    const paragraph = visitor.getByText(paragraphText, { exact: true });
    await expect(paragraph).toHaveCSS(
      "text-align",
      ["distributed", "justify"].includes(alignment) ? "justify" : alignment,
    );
    if (alignment === "distributed")
      await expect(paragraph).toHaveCSS("text-align-last", "justify");
    if (alignment === "justify")
      await expect(paragraph).not.toHaveCSS("text-align-last", "justify");
    checks++;
  }

  // Header and footer have their own editing screens and independent menus.
  await navigate("ส่วนท้ายเว็บไซต์");
  await editText("global.footerNav.0.label", "ทางลัดส่วนท้ายสำหรับทดสอบ");
  await admin
    .locator('.cms-logo-editor input[type="file"]')
    .first()
    .setInputFiles(fixture("footer-logo.svg"));
  await admin
    .getByText("อัปโหลดแล้ว 1 ภาพ กรุณาบันทึกการเปลี่ยนแปลง", { exact: true })
    .waitFor();
  await savePage();
  docs = await request("GET", "/admin/documents");
  const footerLogo = docs.global.value.footerLogo.url;
  assert.match(footerLogo, /^\/uploads\//);
  assert.notEqual(
    docs.global.value.nav[0].label.th,
    docs.global.value.footerNav[0].label.th,
  );
  await navigate("ส่วนหัวเว็บไซต์");
  await editText("global.nav.0.label", "หน้าแรกสำหรับทดสอบส่วนหัว");
  await savePage();
  await visitor.goto(runtime.origin);
  await expect(
    visitor
      .locator("#navigation")
      .getByRole("link", { name: "หน้าแรกสำหรับทดสอบส่วนหัว", exact: true }),
  ).toBeVisible();
  await expect(
    visitor
      .locator("footer")
      .getByRole("link", { name: "ทางลัดส่วนท้ายสำหรับทดสอบ", exact: true }),
  ).toBeVisible();
  await expect(visitor.locator("footer img")).toHaveAttribute(
    "src",
    footerLogo,
  );
  const footerHeadings = await visitor
    .locator("footer .footer-label")
    .evaluateAll((elements) =>
      elements.map((el) => [
        getComputedStyle(el).color,
        getComputedStyle(el).backgroundColor,
      ]),
    );
  assert.ok(
    footerHeadings.length === 2 &&
      footerHeadings.every(
        ([fg, bg]) => fg === "rgb(255, 255, 255)" && bg === "rgba(0, 0, 0, 0)",
      ),
    "Footer headings must be plain white, without white pills",
  );
  for (const width of [1440, 768, 390, 320]) {
    await visitor.setViewportSize({ width, height: 1000 });
    await overflow(visitor, "footer " + width);
  }
  checks += 3;
  await shot(visitor, "revision02-footer-mobile");
  await visitor.setViewportSize({ width: 1440, height: 1000 });
  await audit(visitor, "formatted homepage and footer");

  // Large user-selected typography and a long brand must still fit the mobile
  // header. The menu must start below its actual (possibly wrapped) height.
  const beforeBrand = (await request("GET", "/admin/documents")).global;
  const longBrand = {
    th: "บริษัทเทคโนโลยีและนวัตกรรมเพื่อธุรกิจแห่งอนาคต BSIGN TECH",
    en: "BSIGN TECHNOLOGY AND INNOVATION FOR THE FUTURE OF BUSINESS",
    format: { style: "hero", align: "inherit" },
  };
  await request("PATCH", "/admin/documents/global", {
    revision: beforeBrand.revision,
    patch: { brand: longBrand },
  });
  for (const language of ["th", "en"]) {
    await visitor.setViewportSize({ width: 320, height: 844 });
    await visitor.reload();
    await visitor
      .getByRole("button", { name: language.toUpperCase(), exact: true })
      .click();
    await overflow(visitor, "large mobile brand " + language);
    await visitor.locator(".mobile-menu").click();
    const geometry = await visitor.evaluate(() => ({
      header: document
        .querySelector("header.site-header")
        .getBoundingClientRect().bottom,
      menu: document.querySelector("#navigation").getBoundingClientRect().top,
    }));
    assert.ok(
      geometry.menu >= geometry.header - 2,
      "Mobile menu overlaps the wrapped header",
    );
    await visitor.locator(".mobile-menu").click();
    checks++;
  }
  const restoreBrand = (await request("GET", "/admin/documents")).global;
  await request("PATCH", "/admin/documents/global", {
    revision: restoreBrand.revision,
    patch: {
      brand: {
        ...beforeBrand.value.brand,
        format: beforeBrand.value.brand.format || {
          style: "inherit",
          align: "inherit",
        },
      },
    },
  });

  await adminContext.close();
  await visitorContext.close();
  await runtime.close();
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  await connectBrowserPages();
  await login();
  await navigate("ข้อมูลเว็บไซต์", "หน้าแรก");
  await expect(
    admin.getByRole("heading", { name: "โซลูชันและบริการขององค์กร", exact: true }),
  ).toBeVisible();
  const after = await request("GET", "/admin/documents");
  assert.equal(after.home.value.cards[1].icon.name, "Brain");
  assert.equal(after.home.value.cards[1].editorLabel, "บริการเฉพาะธุรกิจ");
  assert.equal(
    after.home.value.editorLabels.fields["home.services"],
    "รายละเอียดบริการสำหรับผู้ดูแล",
  );
  assert.deepEqual(after.home.value.cards[1].title.format, {
    style: "heading",
    align: "center",
  });
  assert.equal(after.global.value.footerLogo.url, footerLogo);
  assert.equal(
    after.global.value.footerNav[0].label.th,
    "ทางลัดส่วนท้ายสำหรับทดสอบ",
  );
  article = (await request("GET", "/admin/articles")).find(
    (a) => a.slug === "revision02-formatted-article",
  );
  assert.deepEqual(article.blocks[0].text.format, {
    style: "intro",
    align: "justify",
  });
  assert.equal(
    (await visitor.request.get(runtime.origin + footerLogo)).status(),
    200,
  );
  checks++;
  assert.deepEqual(pageErrors, [], "Unexpected browser errors");
  console.log(
    `PASS: ${checks} revision 02 browser checks; editable editor labels, card-owned icons, text roles/alignment, responsive typography, article layout, header/footer and restart`,
  );
} catch (error) {
  for (const [page, name] of [
    [admin, "admin"],
    [visitor, "visitor"],
  ])
    if (page && !page.isClosed())
      await page
        .screenshot({
          path: `test-results/revision02-failure-${name}.png`,
          fullPage: true,
          animations: "disabled",
        })
        .catch(() => {});
  console.error("Revision02 browser errors:", JSON.stringify(pageErrors));
  throw error;
} finally {
  if (browser) await browser.close();
  if (runtime) await runtime.close();
  rmSync(directory, { recursive: true, force: true });
}
