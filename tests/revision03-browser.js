import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { startPreview } from "../server/preview.js";
import { readInitialCredentials } from "./initial-admin-login-smoke.js";

// Private fixtures only: exercise the same API, upload controls and browser routes
// as the downloaded preview without importing or altering a user's database.
const directory = mkdtempSync(path.join(tmpdir(), "bsign-revision03-ui-"));
mkdirSync("test-results", { recursive: true });
let runtime, browser, adminContext, visitorContext, admin, visitor;
let checks = 0;
const pageErrors = [];
const articleTitle = {
  th: "ข่าวที่สร้างโดยไม่กรอกลิงก์บทความ",
  en: "An article created without a custom URL",
};
const paragraph = {
  th: "เนื้อหาที่บันทึกผ่านแบบฟอร์มและเปิดได้ด้วยลิงก์ที่ระบบสร้างให้",
  en: "The saved body can be opened using the automatically generated article URL.",
};
const fixture = (name, color) => ({
  name,
  mimeType: "image/svg+xml",
  buffer: Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><path fill="${color}" d="M0 0h160v120H0z"/></svg>`,
  ),
});

async function connectPages() {
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
  const credentials = readInitialCredentials(runtime.initialAdmin.file);
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
async function articlesPanel() {
  const menu = admin.getByRole("button", { name: "เปิดเมนูจัดการ", exact: true });
  if (
    (await menu.isVisible()) &&
    (await menu.getAttribute("aria-expanded")) !== "true"
  )
    await menu.click();
  await admin
    .locator(".cms-navigation")
    .getByRole("button", { name: "ข่าวสารและบทความ", exact: true })
    .click();
  await admin.getByRole("button", { name: "เพิ่มบทความ", exact: true }).waitFor();
}
function field(fieldPath) {
  return admin.locator(`.cms-bilingual-field[data-field-path="${fieldPath}"]`);
}
async function setLanguage(lang) {
  await admin
    .getByRole("button", {
      name: lang === "th" ? "แก้ไขภาษาไทย" : "แก้ไขภาษาอังกฤษ",
      exact: true,
    })
    .click();
}
async function overflow(page, name) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    name + " overflows",
  );
  checks++;
}
async function audit(page, name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
    [],
    name + " accessibility",
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
async function assertGalleryGeometry(width, columns) {
  await admin.setViewportSize({ width, height: 1000 });
  const cards = admin.locator(".cms-article-gallery-item");
  await expect(cards).toHaveCount(4);
  await admin.locator(".cms-article-gallery-grid").scrollIntoViewIfNeeded();
  const bounds = await cards.evaluateAll((els) =>
    els.map((el) => {
      const rect = el.getBoundingClientRect();
      const image = el.querySelector(".cms-gallery-thumbnail");
      const media = image?.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        mediaWidth: media?.width,
        mediaHeight: media?.height,
      };
    }),
  );
  assert.equal(
    bounds.filter((b) => Math.abs(b.y - bounds[0].y) < 2).length,
    columns,
    `${width}px gallery first row`,
  );
  assert.ok(
    bounds[columns].y > bounds[0].y + 30,
    `${width}px gallery must wrap the next row`,
  );
  assert.ok(
    bounds.every(
      (b) =>
        b.mediaWidth > 0 &&
        b.mediaWidth <= b.width + 1 &&
        b.mediaHeight > 0 &&
        b.mediaHeight <= 300 &&
        Math.abs(b.mediaWidth / b.mediaHeight - 4 / 3) < 0.02,
    ),
    `${width}px gallery thumbnails must stay compact and within their cards`,
  );
  checks += 3;
  await overflow(admin, "gallery " + width);
}
try {
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  await connectPages();
  await login();
  const originals = await request("GET", "/admin/articles");
  const template = structuredClone(originals[0]);
  delete template.id;
  delete template.revision;
  for (const article of originals)
    await request("DELETE", "/admin/articles/" + article.id, {
      revision: article.revision,
    });
  let docs = await request("GET", "/admin/documents");
  const categories = docs.news.value.categories.slice(0, 3).map((c) => c.id);
  assert.equal(categories.length, 3, "fixture requires three categories");
  // Retain both legacy settings that previously limited the homepage results.
  await request("PATCH", "/admin/documents/home", {
    revision: docs.home.revision,
    patch: { newsCategory: categories[1] },
  });
  await request("PATCH", "/admin/documents/news", {
    revision: docs.news.revision,
    patch: { pageSize: 1 },
  });
  const now = Date.now();
  const create = (slug, category, minutesAgo, status = "published") =>
    request("POST", "/admin/articles", {
      ...structuredClone(template),
      slug,
      category,
      status,
      title: { th: "ข่าวล่าสุด " + slug, en: "Latest news " + slug },
      body: { th: "เนื้อหาฉบับเต็ม " + slug, en: "Complete body " + slug },
      blocks: [
        {
          id: "body-" + slug,
          text: { th: "เนื้อหาฉบับเต็ม " + slug, en: "Complete body " + slug },
          image: null,
          align: "center",
          ratio: "original",
        },
      ],
      gallery: [],
      publishedAt: new Date(now - minutesAgo * 60000).toISOString(),
    });
  await create("older-published", categories[0], 1440);
  await create("draft-hidden", categories[0], 0, "draft");
  await create("future-hidden", categories[0], -1440);
  const latest = [];
  for (let i = 0; i < 3; i++)
    latest.push(await create("latest-" + (i + 1), categories[i], i + 1));
  checks++;
  for (const lang of ["th", "en"]) {
    await visitor.goto(runtime.origin);
    await visitor
      .getByRole("button", { name: lang.toUpperCase(), exact: true })
      .click();
    const cards = visitor.locator(".news-card");
    await expect(cards).toHaveCount(3);
    await expect(cards.locator("h3")).toHaveText(
      latest.map((a) => a.title[lang]),
    );
    const links = await cards
      .locator(".news-card-media")
      .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    assert.deepEqual(
      links,
      latest.map((a) => "/news/" + a.slug),
    );
    const response = await visitor.evaluate(() =>
      fetch("/api/articles?limit=3").then((r) => r.json()),
    );
    assert.deepEqual(
      response.items.map((a) => a.id),
      latest.map((a) => a.id),
    );
    checks += 3;
    await overflow(visitor, "three latest articles " + lang);
  }
  await shot(visitor, "revision03-home-latest");
  await audit(visitor, "latest articles homepage");

  await articlesPanel();
  await admin.getByRole("button", { name: "เพิ่มบทความ", exact: true }).click();
  const slugInput = admin.locator('input[name="slug"]');
  await expect(slugInput).toHaveValue("");
  assert.equal(
    await slugInput.getAttribute("required"),
    null,
    "custom article URL must be optional",
  );
  for (const lang of ["th", "en"]) {
    await setLanguage(lang);
    const name = lang === "th" ? "ไทย" : "English";
    await field("articles.title")
      .getByLabel(name, { exact: true })
      .fill(articleTitle[lang]);
    await field("articles.excerpt")
      .getByLabel(name, { exact: true })
      .fill(
        lang === "th"
          ? "คำโปรยสำหรับทดสอบลิงก์อัตโนมัติ"
          : "A summary for the automatic URL test.",
      );
    await field("articles.blocks.0.body")
      .getByLabel(name, { exact: true })
      .fill(paragraph[lang]);
  }
  await setLanguage("th");
  await admin.getByLabel(/สถานะบทความ/).selectOption("published");
  checks++;
  await admin
    .locator('.cms-article-gallery-tools input[type="file"]')
    .setInputFiles([
      fixture("atmosphere-a.svg", "#446688"),
      fixture("atmosphere-b.svg", "#884466"),
      fixture("atmosphere-c.svg", "#668844"),
      fixture("atmosphere-d.svg", "#886644"),
    ]);
  await expect(admin.locator(".cms-article-gallery-item")).toHaveCount(4);
  await admin
    .getByText("อัปโหลดแล้ว 4 ภาพ กรุณาบันทึกการเปลี่ยนแปลง", { exact: true })
    .waitFor();
  checks++;
  for (const [width, columns] of [
    [1440, 3],
    [768, 2],
    [320, 1],
  ])
    await assertGalleryGeometry(width, columns);
  await admin.setViewportSize({ width: 1440, height: 1000 });
  await admin.locator("#article-gallery").scrollIntoViewIfNeeded();
  await admin.locator(".cms-gallery-thumbnail img").first().waitFor();
  await expect
    .poll(() =>
      admin
        .locator(".cms-gallery-thumbnail img")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await shot(admin, "revision03-gallery-grid");
  await audit(admin, "compact gallery editor");
  const tiles = admin.locator(".cms-article-gallery-item");
  const originalUrls = await tiles
    .locator(".cms-gallery-thumbnail img")
    .evaluateAll((els) => els.map((el) => el.getAttribute("src")));
  assert.equal(originalUrls.length, 4);
  await tiles.first().locator(".cms-gallery-item-details > summary").click();
  await field("articles.gallery.0.alt")
    .getByLabel("ไทย", { exact: true })
    .fill("ภาพบรรยากาศที่แก้คำอธิบายแล้ว");
  await setLanguage("en");
  await field("articles.gallery.0.alt")
    .getByLabel("English", { exact: true })
    .fill("Atmosphere photo with an edited description");
  await setLanguage("th");
  await admin
    .getByRole("button", { name: "ย้ายภาพเพิ่มเติม 1 ลง", exact: true })
    .click();
  await admin
    .getByRole("button", { name: "ลบภาพเพิ่มเติม 4", exact: true })
    .click();
  await expect(tiles).toHaveCount(3);
  checks += 2;
  await admin.getByRole("button", { name: "บันทึกบทความ", exact: true }).click();
  await admin.getByText("บันทึกบทความแล้ว", { exact: true }).waitFor();
  let created = (await request("GET", "/admin/articles")).find(
    (a) => a.title.th === articleTitle.th,
  );
  assert.ok(created, "article without a custom slug must be saved");
  assert.match(created.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.deepEqual(
    created.gallery.map((image) => image.url),
    [originalUrls[1], originalUrls[0], originalUrls[2]],
  );
  assert.deepEqual(created.gallery[1].alt, {
    th: "ภาพบรรยากาศที่แก้คำอธิบายแล้ว",
    en: "Atmosphere photo with an edited description",
  });
  checks += 3;
  for (const lang of ["th", "en"]) {
    await visitor.goto(runtime.origin);
    await visitor
      .getByRole("button", { name: lang.toUpperCase(), exact: true })
      .click();
    await expect(visitor.locator(".news-card")).toHaveCount(3);
    await visitor
      .locator(".news-card")
      .first()
      .locator(".news-card-media")
      .click();
    await expect(visitor).toHaveURL(runtime.origin + "/news/" + created.slug);
    await expect(visitor.locator(".article h1")).toHaveText(articleTitle[lang]);
    await expect(
      visitor.getByText(paragraph[lang], { exact: true }),
    ).toBeVisible();
    assert.deepEqual(
      await visitor
        .locator(".article-gallery img")
        .evaluateAll((els) => els.map((el) => el.getAttribute("src"))),
      created.gallery.map((image) => image.url),
    );
    checks += 3;
    await overflow(visitor, "saved article " + lang);
  }
  await adminContext.close();
  await visitorContext.close();
  await runtime.close();
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  await connectPages();
  await login();
  await articlesPanel();
  await admin
    .getByRole("button", { name: "แก้ไข " + articleTitle.th, exact: true })
    .click();
  await expect(admin.locator('input[name="slug"]')).toHaveValue(created.slug);
  await expect(admin.locator(".cms-article-gallery-item")).toHaveCount(3);
  created = (await request("GET", "/admin/articles")).find(
    (a) => a.id === created.id,
  );
  assert.deepEqual(
    created.gallery.map((image) => image.url),
    [originalUrls[1], originalUrls[0], originalUrls[2]],
  );
  assert.equal(created.gallery[1].alt.th, "ภาพบรรยากาศที่แก้คำอธิบายแล้ว");
  await visitor.goto(runtime.origin + "/news/" + created.slug);
  await expect(visitor.locator(".article-gallery img")).toHaveCount(3);
  for (const image of created.gallery)
    assert.equal(
      (await visitor.request.get(runtime.origin + image.url)).status(),
      200,
      "uploaded gallery image must remain after restart",
    );
  checks += 4;
  assert.deepEqual(pageErrors, []);
  console.log(
    `PASS: ${checks} revision 03 browser checks; all-category latest articles, optional article URLs, compact gallery grid, image editing and restart`,
  );
} catch (error) {
  for (const [page, name] of [
    [admin, "admin"],
    [visitor, "visitor"],
  ])
    if (page && !page.isClosed())
      await shot(page, "revision03-failure-" + name).catch(() => {});
  console.error("Revision03 browser errors:", JSON.stringify(pageErrors));
  throw error;
} finally {
  if (browser) await browser.close();
  if (runtime) await runtime.close();
  rmSync(directory, { recursive: true, force: true });
}
