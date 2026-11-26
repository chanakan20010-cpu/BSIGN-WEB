import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { startPreview } from "../server/preview.js";
import { readInitialCredentials } from "./initial-admin-login-smoke.js";

// All accounts, edits and screenshots belong to this disposable preview. Never
// read a user's .data/.env or include generated account values in diagnostics.
const directory = mkdtempSync(path.join(tmpdir(), "bsign-revision05-ui-"));
mkdirSync("test-results", { recursive: true });
let runtime, browser, adminContext, visitorContext, admin, visitor, credentials;
let checks = 0;
let activeCheck = "startup";
let originalBrandAccent;
const errors = [];
const colors = {
  brand: "#6a2f85",
  title: "#245a86",
  subtitle: "#92502d",
  placeholder: "#3d5e83",
  articleTitle: "#5a307f",
  excerpt: "#285d47",
};
const longTitle = {
  th: "ทีมวิศวกรรมพัฒนานวัตกรรมดิจิทัลเพื่อสร้างโอกาสใหม่ให้ธุรกิจอย่างยั่งยืน ".repeat(5).trim(),
  en: "Engineering teams build digital innovations to create sustainable business opportunities "
    .repeat(6)
    .trim(),
};
const longExcerpt = {
  th: "ทำความรู้จักแนวทางการพัฒนาซอฟต์แวร์ คลาวด์ และระบบอัตโนมัติที่ปรับให้เหมาะสมกับแต่ละองค์กร พร้อมรายละเอียดสำหรับทีมงานและผู้สนใจ "
    .repeat(6)
    .trim(),
  en: "Discover practical software, cloud and automation approaches designed for each organization, with complete information for engineering teams and interested readers. "
    .repeat(6)
    .trim(),
};
const shortTitle = { th: "ข่าวสั้น", en: "Short news" };
const shortExcerpt = { th: "คำโปรยสั้น", en: "A short introduction." };

async function check(name, operation) {
  activeCheck = name;
  await operation();
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
    page.on("pageerror", (error) => errors.push(error.message));
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
        throw Error(
          `Fixture request failed: ${method} ${url} (${response.status})`,
        );
      return response.status === 204 ? null : response.json();
    },
    { method, url, body },
  );
}
async function navigate(name, tab) {
  await admin
    .locator(".cms-navigation")
    .getByRole("button", { name, exact: true })
    .click();
  if (tab)
    await admin
      .locator(".cms-website-tabs")
      .getByRole("button", { name: tab, exact: true })
      .click();
}
function field(name) {
  return admin.locator(`.cms-bilingual-field[data-field-path="${name}"]`);
}
async function colorControls(name) {
  const tools = field(name).locator(".cms-text-editor-tools");
  const advanced = tools.locator(".cms-text-format-controls");
  await expect(advanced).toHaveCount(1);
  if ((await advanced.getAttribute("open")) === null)
    await advanced.locator(":scope > summary").click();
  return tools;
}
async function setColor(name, value) {
  const controls = await colorControls(name);
  await controls.locator(".cms-text-color-hex").fill(value);
  await controls.locator(".cms-text-color-hex").blur();
  await expect(controls.getByLabel(/^สีข้อความ /)).toHaveValue(value);
  return controls;
}
async function resetColor(name) {
  const controls = await colorControls(name);
  await controls.getByRole("button", { name: /^ใช้สีตามสไตล์ / }).click();
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
  assert.equal((await response).status(), 200);
  await expect(save).toBeDisabled();
}
async function language(lang) {
  await visitor.locator(`header .languages button[lang="${lang}"]`).click();
  await expect(visitor.locator("html")).toHaveAttribute("lang", lang);
  await visitor.evaluate(() => document.fonts.ready);
}
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
}
async function navigationWeights(route, width, lang) {
  await visitor.setViewportSize({ width, height: 1000 });
  await visitor.goto(runtime.origin + route);
  await language(lang);
  const selected = route.startsWith("/news/") ? "/news" : route;
  if (width < 700) await visitor.locator("header .mobile-menu").click();
  for (const nav of [
    visitor.locator("header #navigation"),
    visitor.locator(".footer-navigation"),
  ]) {
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    for (const link of await nav.locator("a").all()) {
      const weight =
        (await link.getAttribute("href")) === selected ? "700" : "400";
      await expect(link).toHaveCSS("font-weight", weight);
      await expect(link.locator(".bs-formatted-text").first()).toHaveCSS(
        "font-weight",
        weight,
      );
    }
  }
  await noOverflow(visitor);
}
async function clampMetrics(locator, text, clipped = true) {
  await expect(locator).toHaveText(text);
  const metrics = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      line: parseFloat(style.lineHeight),
      scroll: element.scrollHeight,
      clamp: style.webkitLineClamp,
      overflow: style.overflow,
    };
  });
  assert.equal(metrics.clamp, "3");
  assert.equal(metrics.overflow, "hidden");
  assert.ok(metrics.height <= metrics.line * 3 + 1);
  if (clipped) assert.ok(metrics.scroll > metrics.height + 1);
  else assert.ok(metrics.height <= metrics.line * 1.1);
}
async function featured(
  width,
  lang,
  title = longTitle,
  excerpt = longExcerpt,
  clipped = true,
) {
  await visitor.setViewportSize({ width, height: 1000 });
  await visitor.goto(runtime.origin + "/news");
  await language(lang);
  await clampMetrics(visitor.locator(".featured h2"), title[lang], clipped);
  await clampMetrics(
    visitor.locator(".featured > div:last-child > p"),
    excerpt[lang],
    clipped,
  );
  await noOverflow(visitor);
}
async function patchArticle(article, patch) {
  return request("PATCH", "/admin/articles/" + article.id, {
    revision: article.revision,
    patch,
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
  const original = await request("GET", "/admin/documents");
  const template = structuredClone(
    (await request("GET", "/admin/articles"))[0],
  );
  delete template.id;
  delete template.revision;
  // Explicit menu formats must not hide which route is selected.
  const nav = original.global.value.nav.map((item) => ({
    ...item,
    label: { ...item.label, format: { style: "menu" } },
  }));
  const footerNav = nav.map((item) => ({
    ...item,
    label: { ...item.label, format: { style: "footer" } },
  }));
  await request("PATCH", "/admin/documents/global", {
    revision: original.global.revision,
    patch: { nav, footerNav },
  });
  let article = await request("POST", "/admin/articles", {
    ...template,
    slug: "revision05-long-feature",
    title: { ...longTitle, format: { style: "heading", align: "left" } },
    excerpt: { ...longExcerpt, format: { style: "body" } },
    body: {
      th: "เนื้อหาบทความฉบับเต็มสำหรับทดสอบ",
      en: "Complete article body for acceptance testing.",
    },
    blocks: [
      {
        id: "complete-introduction",
        text: longExcerpt,
        image: null,
        align: "center",
        ratio: "original",
      },
    ],
    publishedAt: new Date(Date.now() - 60000).toISOString(),
    status: "published",
  });
  const articlePath = "/news/" + article.slug;
  // Fixture writes happened outside the mounted editor. Reload its document
  // revisions before exercising real UI saves; a stale editor must reject 409.
  await admin.reload();
  await admin.locator(".cms-maintenance-controls").waitFor();

  await check(
    "desktop Thai header/footer emphasize exactly the active page, including article routes",
    async () => {
      for (const route of ["/", "/news", "/about", "/contact", articlePath])
        await navigationWeights(route, 1440, "th");
      originalBrandAccent = await visitor
        .locator("header .brand em")
        .evaluate((element) => getComputedStyle(element).color);
    },
  );
  await check(
    "mobile English header/footer preserve active-page weights and fit the viewport",
    async () => {
      for (const route of ["/", "/news", "/about", "/contact", articlePath])
        await navigationWeights(route, 390, "en");
    },
  );
  await check(
    "news category selection changes the only bold filter in both languages",
    async () => {
      await visitor.setViewportSize({ width: 1440, height: 1000 });
      for (const lang of ["th", "en"]) {
        await visitor.goto(runtime.origin + "/news");
        await language(lang);
        const filters = visitor.locator(".filters button");
        await expect(filters).toHaveCount(
          original.news.value.categories.length + 1,
        );
        for (const selected of [0, 1, 2]) {
          await filters.nth(selected).click();
          await expect(filters.nth(selected)).toHaveAttribute(
            "aria-pressed",
            "true",
          );
          for (let i = 0; i < (await filters.count()); i++) {
            const weight = i === selected ? "700" : "400";
            await expect(filters.nth(i)).toHaveCSS("font-weight", weight);
            await expect(
              filters.nth(i).locator(".bs-formatted-text"),
            ).toHaveCSS("font-weight", weight);
          }
        }
      }
    },
  );
  await check(
    "long featured titles and excerpts are clipped to three lines on desktop in TH/EN",
    async () => {
      for (const lang of ["th", "en"]) await featured(1440, lang);
      await visitor.locator(".featured").screenshot({
        path: "test-results/revision05-featured-news.png",
        animations: "disabled",
      });
    },
  );
  await check(
    "three-line featured limits hold on mobile in TH/EN",
    async () => {
      for (const lang of ["th", "en"]) await featured(390, lang);
    },
  );
  await check(
    "opening the full article retains the entire title and introduction",
    async () => {
      for (const lang of ["th", "en"]) {
        await visitor.goto(runtime.origin + articlePath);
        await language(lang);
        await expect(visitor.locator(".article-hero h1")).toHaveText(
          longTitle[lang],
        );
        await expect(visitor.locator(".article-body .prose")).toHaveText(
          longExcerpt[lang],
        );
        await expect(visitor.locator(".article-hero h1")).not.toHaveCSS(
          "-webkit-line-clamp",
          "3",
        );
      }
      const stored = (await request("GET", "/admin/articles")).find(
        (item) => item.id === article.id,
      );
      assert.equal(stored.title.th, longTitle.th);
      assert.equal(stored.excerpt.en, longExcerpt.en);
    },
  );
  await check(
    "short featured copy uses its natural height without reserving three lines",
    async () => {
      article = await patchArticle(article, {
        title: shortTitle,
        excerpt: shortExcerpt,
      });
      for (const lang of ["th", "en"])
        await featured(1440, lang, shortTitle, shortExcerpt, false);
      article = await patchArticle(article, {
        title: { ...longTitle, format: { style: "heading", align: "left" } },
        excerpt: { ...longExcerpt, format: { style: "body" } },
      });
    },
  );
  await check(
    "contact methods, social channels and office icons share dimensions across viewport sizes",
    async () => {
      for (const width of [1440, 768, 390, 320]) {
        await visitor.setViewportSize({ width, height: 1000 });
        await visitor.goto(runtime.origin + "/contact");
        const icons = visitor.locator(
          ".contact-page :is(.contact-info,.social,.office) .icon",
        );
        await expect(icons).toHaveCount(
          original.contact.value.socials.length + 4,
        );
        for (const icon of await icons.all()) {
          await expect(icon).toHaveCSS("width", "40px");
          await expect(icon).toHaveCSS("height", "40px");
          const glyph = icon.locator(
            ":scope > svg, :scope > img, :scope > .mask",
          );
          await expect(glyph).toHaveCSS("width", "22px");
          await expect(glyph).toHaveCSS("height", "22px");
        }
        await noOverflow(visitor);
      }
      await visitor.setViewportSize({ width: 1440, height: 1000 });
      await visitor.screenshot({
        path: "test-results/revision05-contact-icons.png",
        fullPage: true,
        animations: "disabled",
      });
    },
  );
  await check(
    "header field color has a local accessible control and live preview",
    async () => {
      await navigate("ส่วนหัวเว็บไซต์");
      const controls = await setColor("global.brand", colors.brand);
      await expect(
        controls
          .frameLocator(".cms-text-format-preview iframe")
          .locator("[data-preview-text]")
          .first(),
      ).toHaveCSS("color", "rgb(106, 47, 133)");
      await expect(controls.getByLabel(/^สีข้อความ /)).toHaveAccessibleName(
        /^สีข้อความ /,
      );
      await field("global.brand").screenshot({
        path: "test-results/revision05-header-color-editor.png",
        animations: "disabled",
      });
      const audit = await new AxeBuilder({ page: admin })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        audit.violations
          .filter((violation) =>
            ["serious", "critical"].includes(violation.impact),
          )
          .map((violation) => violation.id),
        [],
      );
      await saveDocument("global");
      await admin.reload();
      await expect(
        field("global.brand").locator(".cms-text-color-hex"),
      ).toHaveValue(colors.brand);
    },
  );
  await check(
    "saved brand color reaches both wordmark segments in TH/EN without changing shared typography",
    async () => {
      for (const lang of ["th", "en"]) {
        await visitor.goto(runtime.origin + "/");
        await language(lang);
        for (const wordmark of [
          visitor.locator("header .brand strong"),
          visitor.locator(".footer-wordmark"),
        ]) {
          await expect(wordmark).toHaveCSS("color", "rgb(106, 47, 133)");
          await expect(wordmark.locator("em")).toHaveCSS(
            "color",
            "rgb(106, 47, 133)",
          );
        }
      }
      assert.deepEqual(
        (await request("GET", "/admin/documents")).styles,
        original.styles,
      );
    },
  );
  await check(
    "contact title and subtitle colors are edited beside their own text and survive reload",
    async () => {
      await navigate("ข้อมูลเว็บไซต์", "ติดต่อเรา");
      await setColor("contact.title.0.text", colors.title);
      await setColor("contact.subtitle", colors.subtitle);
      await setColor("contact.fields.name.placeholder", colors.placeholder);
      await saveDocument("contact");
      await admin.reload();
      await expect(
        field("contact.title.0.text").locator(".cms-text-color-hex"),
      ).toHaveValue(colors.title);
      await expect(
        field("contact.subtitle").locator(".cms-text-color-hex"),
      ).toHaveValue(colors.subtitle);
    },
  );
  await check(
    "placeholder color uses its own contact field control and reaches native placeholder text in TH/EN",
    async () => {
      for (const lang of ["th", "en"]) {
        await visitor.goto(runtime.origin + "/contact");
        await language(lang);
        const input = visitor.locator('.form-card input[name="name"]');
        await expect(input).toHaveAttribute(
          "placeholder",
          original.contact.value.fields.name.placeholder[lang],
        );
        const style = await input.evaluate((element) => ({
          color: getComputedStyle(element, "::placeholder").color,
          opacity: getComputedStyle(element, "::placeholder").opacity,
        }));
        assert.deepEqual(style, { color: "rgb(61, 94, 131)", opacity: "1" });
      }
    },
  );
  await check(
    "contact local colors override legacy line colors in both languages and leave other fields intact",
    async () => {
      for (const lang of ["th", "en"]) {
        await visitor.goto(runtime.origin + "/contact");
        await language(lang);
        await expect(
          visitor.locator(".contact-banner h1 > .bs-formatted-text"),
        ).toHaveCSS("color", "rgb(36, 90, 134)");
        await expect(visitor.locator(".contact-banner > h2")).toHaveCSS(
          "color",
          "rgb(146, 80, 45)",
        );
      }
      const docs = await request("GET", "/admin/documents");
      assert.equal(
        docs.contact.value.title[0].color,
        original.contact.value.title[0].color,
      );
      assert.deepEqual(
        docs.contact.value.heading,
        original.contact.value.heading,
      );
      assert.deepEqual(docs.styles, original.styles);
      await visitor.screenshot({
        path: "test-results/revision05-contact-colors.png",
        fullPage: true,
        animations: "disabled",
      });
    },
  );
  await check(
    "article title and excerpt colors save through article editing controls",
    async () => {
      await navigate("ข่าวสารและบทความ");
      await admin
        .getByRole("button", { name: "แก้ไข " + article.title.th, exact: true })
        .click();
      await setColor("articles.title", colors.articleTitle);
      await setColor("articles.excerpt", colors.excerpt);
      const response = admin.waitForResponse(
        (r) =>
          r.url().endsWith("/api/admin/articles/" + article.id) &&
          r.request().method() === "PATCH",
      );
      await admin
        .getByRole("button", { name: "บันทึกบทความ", exact: true })
        .click();
      assert.equal((await response).status(), 200);
      await admin.getByText("บันทึกบทความแล้ว", { exact: true }).waitFor();
      article = (await request("GET", "/admin/articles")).find(
        (item) => item.id === article.id,
      );
      assert.equal(article.title.format.color, colors.articleTitle);
      assert.equal(article.excerpt.format.color, colors.excerpt);
      assert.equal(article.title.format.style, "heading");
      assert.equal(article.title.format.align, "left");
      await featured(1440, "th");
      await expect(visitor.locator(".featured h2")).toHaveCSS(
        "color",
        "rgb(90, 48, 127)",
      );
      await expect(visitor.locator(".featured > div:last-child > p")).toHaveCSS(
        "color",
        "rgb(40, 93, 71)",
      );
      await visitor.goto(runtime.origin + articlePath);
      await expect(visitor.locator(".article-hero h1")).toHaveCSS(
        "color",
        "rgb(90, 48, 127)",
      );
    },
  );
  await check(
    "saved page and article color selections survive a server restart",
    async () => {
      await adminContext.close();
      await visitorContext.close();
      await runtime.close();
      runtime = await startPreview({ directory, provisionInitialAdmin: true });
      await connect();
      const docs = await request("GET", "/admin/documents");
      assert.equal(docs.global.value.brand.format.color, colors.brand);
      assert.equal(docs.contact.value.title[0].text.format.color, colors.title);
      assert.equal(docs.contact.value.subtitle.format.color, colors.subtitle);
      assert.equal(
        docs.contact.value.fields.name.placeholder.format.color,
        colors.placeholder,
      );
      assert.deepEqual(docs.styles, original.styles);
      const stored = (await request("GET", "/admin/articles")).find(
        (item) => item.id === article.id,
      );
      assert.deepEqual(stored, article);
      await visitor.goto(runtime.origin + "/contact");
      await expect(visitor.locator(".contact-banner > h2")).toHaveCSS(
        "color",
        "rgb(146, 80, 45)",
      );
      await visitor.goto(runtime.origin + articlePath);
      await expect(visitor.locator(".article-hero h1")).toHaveCSS(
        "color",
        "rgb(90, 48, 127)",
      );
    },
  );
  await check(
    "resetting a contact color restores its inherited role or legacy line color",
    async () => {
      await navigate("ข้อมูลเว็บไซต์", "ติดต่อเรา");
      await resetColor("contact.title.0.text");
      await resetColor("contact.subtitle");
      await saveDocument("contact");
      await visitor.goto(runtime.origin + "/contact");
      await expect(
        visitor.locator(".contact-banner h1 > .bs-formatted-text"),
      ).toHaveCSS("color", "rgb(0, 0, 0)");
      await expect(visitor.locator(".contact-banner > h2")).toHaveCSS(
        "color",
        "rgb(0, 0, 0)",
      );
      const docs = await request("GET", "/admin/documents");
      assert.equal(docs.contact.value.title[0].text.format.color, "inherit");
      assert.equal(docs.contact.value.subtitle.format.color, "inherit");
      assert.deepEqual(docs.styles, original.styles);
    },
  );
  await check(
    "brand reset restores its original two-tone treatment and preserves other saved colors",
    async () => {
      await navigate("ส่วนหัวเว็บไซต์");
      await resetColor("global.brand");
      await saveDocument("global");
      await admin.reload();
      await visitor.goto(runtime.origin + "/");
      await expect(visitor.locator("header .brand strong")).not.toHaveAttribute(
        "data-text-color",
        "custom",
      );
      await expect(visitor.locator("header .brand strong em")).toHaveCSS(
        "color",
        originalBrandAccent,
      );
      const docs = await request("GET", "/admin/documents");
      assert.equal(docs.global.value.brand.format.color, "inherit");
      assert.deepEqual(docs.styles, original.styles);
      assert.equal(
        (await request("GET", "/admin/articles")).find(
          (item) => item.id === article.id,
        ).title.format.color,
        colors.articleTitle,
      );
      assert.deepEqual(errors, []);
    },
  );
  console.log(
    `PASS: ${checks} revision05 browser checks; selected navigation and filters, three-line featured copy, full articles, consistent contact icons, local color controls, preview, save/reload, TH/EN, reset and restart persistence`,
  );
} catch (error) {
  const location =
    error.stack?.match(/revision05-browser\.js:\d+:\d+/)?.[0] || "unknown";
  console.error(
    `::error title=Revision 05 browser::${checks} checks completed; ${activeCheck}; ${location}`,
  );
  // Redact generated account/capability values even from local diagnostics.
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
