import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { startPreview } from "../server/preview.js";
import { readInitialCredentials } from "./initial-admin-login-smoke.js";

// Real user flows against a private, disposable database and uploaded files.
const directory = mkdtempSync(path.join(tmpdir(), "bsign-revision01-ui-"));
mkdirSync("test-results", { recursive: true });
let runtime, browser, admin, visitor, adminContext, visitorContext;
const errors = [];
let checks = 0;
const fixture = (name, color) => ({
  name,
  mimeType: "image/svg+xml",
  buffer: Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><path fill="${color}" d="M0 0h160v90H0z"/></svg>`,
  ),
});
const bodies = {
  th: [
    "ย่อหน้าแรกสำหรับทดสอบการบันทึกเนื้อหาฉบับเต็ม",
    "ย่อหน้าถัดไปต้องแสดงครบและเรียงลำดับถูกต้อง",
  ],
  en: [
    "The first complete paragraph saved through the article editor.",
    "The next paragraph must appear in full and in the saved order.",
  ],
};
const maintenanceTitle = {
  th: "หยุดปรับปรุงจากการทดสอบจริง",
  en: "Scheduled browser verification",
};
const maintenanceMessage = {
  th: "ทีมงานกำลังปรับปรุงเว็บไซต์ กรุณากลับมาใหม่ภายหลัง",
  en: "We are updating the website. Please return later.",
};
async function revealControl(control) {
  await control.waitFor({ state: "attached" });
  const parents = await control.locator("xpath=ancestor::details").all();
  for (const detail of parents) {
    if ((await detail.getAttribute("open")) === null)
      await detail.locator(":scope > summary").click();
  }
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
async function language(page, lang) {
  await page
    .getByRole("button", { name: lang.toUpperCase(), exact: true })
    .click();
}
async function editLanguage(lang) {
  await admin
    .getByRole("button", {
      name: lang === "th" ? "แก้ไขภาษาไทย" : "แก้ไขภาษาอังกฤษ",
      exact: true,
    })
    .click();
}
async function navigate(parent, tab) {
  await admin
    .locator(".cms-navigation")
    .getByRole("button", { name: parent, exact: true })
    .click();
  if (tab)
    await admin
      .locator(".cms-website-tabs")
      .getByRole("button", { name: tab, exact: true })
      .click();
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
    path: "test-results/" + name + ".png",
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
    page.on("pageerror", (error) => errors.push(error.message));
  }

  // Shipped styles must be actual settings, and the same news card geometry is
  // used for home, list and related news at both desktop and mobile widths.
  for (const width of [1440, 390]) {
    await visitor.setViewportSize({ width, height: 1000 });
    for (const route of ["/", "/news", "/news/company-launch"]) {
      await visitor.goto(runtime.origin + route);
      await visitor.locator(".news-card-media").first().waitFor();
      const ratios = await visitor
        .locator(".news-card-media")
        .evaluateAll((elements) =>
          elements.map((element) => {
            const b = element.getBoundingClientRect();
            return b.width / b.height;
          }),
        );
      assert.ok(
        ratios.length > 0 &&
          ratios.every((ratio) => Math.abs(ratio - 1.8) < 0.03),
        route + " inconsistent news media ratio",
      );
      checks++;
      await overflow(visitor, route + " at " + width);
      if (route === "/news" && width === 1440) {
        const bounds = await visitor
          .locator(".featured")
          .evaluate((element) => {
            const frame = element.getBoundingClientRect(),
              media = element
                .querySelector(".featured-media")
                .getBoundingClientRect();
            return [frame.bottom, media.bottom];
          });
        assert.ok(
          Math.abs(bounds[0] - bounds[1]) <= 2,
          "Featured image leaves a white bottom gap",
        );
        await expect(visitor.locator(".filter-bar form .icon")).toHaveCSS(
          "background-color",
          "rgba(0, 0, 0, 0)",
        );
        checks += 2;
      }
    }
  }
  await visitor.setViewportSize({ width: 1440, height: 1000 });
  for (const route of ["/", "/about", "/news", "/contact"]) {
    await visitor.goto(runtime.origin + route);
    await visitor.locator("main h1").waitFor();
    const backgrounds = await visitor
      .locator(".button .icon")
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).backgroundColor),
      );
    assert.ok(
      backgrounds.length > 0 &&
        backgrounds.every((color) => color === "rgba(0, 0, 0, 0)"),
      route + " button icon background",
    );
    checks++;
  }
  const brandColors = await visitor
    .locator(".social .icon")
    .evaluateAll((elements) =>
      elements.map((element) => [
        getComputedStyle(element).color,
        getComputedStyle(element).backgroundColor,
      ]),
    );
  assert.deepEqual(brandColors, [
    ["rgb(6, 199, 85)", "rgba(0, 0, 0, 0)"],
    ["rgb(10, 102, 194)", "rgba(0, 0, 0, 0)"],
    ["rgb(8, 102, 255)", "rgba(0, 0, 0, 0)"],
  ]);
  checks++;

  await login();
  await navigate("ข้อมูลเว็บไซต์", "หน้าแรก");
  await expect(admin.locator(".cms-section-nav")).toHaveCount(0);
  await expect(
    admin.getByRole("heading", { name: "บริการของเรา", exact: true }),
  ).toBeVisible();
  await expect(
    admin.getByRole("heading", { name: "จุดแข็งของเรา", exact: true }),
  ).toBeVisible();
  await expect(admin.getByLabel("เลือกจากคลัง", { exact: true })).toHaveCount(0);
  checks++;
  const icon = admin.locator(".cms-inline-icon-editor").filter({
    has: admin.getByLabel("รหัสสีไอคอน home.hero.arrow", { exact: true }),
  });
  await revealControl(icon.locator("select").first());
  await icon.getByRole("combobox").first().selectOption("Rocket");
  await icon
    .getByLabel("รหัสสีไอคอน home.hero.arrow", { exact: true })
    .fill("#123456");
  await icon.getByLabel("ไม่มีพื้นหลัง", { exact: true }).uncheck();
  await icon.getByLabel("รหัสพื้นหลัง HEX", { exact: true }).fill("#e1f2a3");
  await admin
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  await admin.getByText("บันทึกแล้ว", { exact: true }).waitFor();
  await visitor.goto(runtime.origin);
  await expect(visitor.locator(".hero .button .icon")).toHaveCSS(
    "color",
    "rgb(18, 52, 86)",
  );
  await expect(visitor.locator(".hero .button .icon")).toHaveCSS(
    "background-color",
    "rgb(225, 242, 163)",
  );
  await visitor.goto(runtime.origin + "/about");
  await expect(visitor.locator(".cta .button .icon")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  checks++;
  await icon.getByLabel("ไม่มีพื้นหลัง", { exact: true }).check();
  await admin
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  await admin.getByText("บันทึกแล้ว", { exact: true }).waitFor();
  await visitor.goto(runtime.origin);
  await expect(visitor.locator(".hero .button .icon")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  checks++;

  await navigate("ข่าวสารและบทความ");
  await admin.getByRole("button", { name: "เพิ่มบทความ", exact: true }).click();
  await editLanguage("th");
  await admin
    .getByLabel("ไทย", { exact: true })
    .nth(0)
    .fill("บทความหลายย่อหน้าจากการทดสอบจริง");
  await admin
    .getByLabel("ไทย", { exact: true })
    .nth(1)
    .fill("คำโปรยสั้นที่ต้องไม่ถูกแสดงซ้ำแทนเนื้อหา");
  await admin
    .locator(".cms-paragraph-block")
    .nth(0)
    .getByLabel("ไทย", { exact: true })
    .fill(bodies.th[0]);
  await admin
    .getByRole("button", { name: "เพิ่มย่อหน้าถัดไป", exact: true })
    .click();
  await admin
    .locator(".cms-paragraph-block")
    .nth(1)
    .getByLabel("ไทย", { exact: true })
    .fill(bodies.th[1]);
  await editLanguage("en");
  await admin
    .getByLabel("English", { exact: true })
    .nth(0)
    .fill("A complete article with multiple paragraphs");
  await admin
    .getByLabel("English", { exact: true })
    .nth(1)
    .fill("A short teaser must not replace the saved body.");
  await admin
    .locator(".cms-paragraph-block")
    .nth(0)
    .getByLabel("English", { exact: true })
    .fill(bodies.en[0]);
  await admin
    .locator(".cms-paragraph-block")
    .nth(1)
    .getByLabel("English", { exact: true })
    .fill(bodies.en[1]);
  await admin
    .getByRole("button", { name: "เพิ่มย่อหน้าถัดไป", exact: true })
    .click();
  await admin.getByRole("button", { name: "ลบย่อหน้า 3", exact: true }).click();
  await expect(admin.locator(".cms-paragraph-block")).toHaveCount(2);
  checks++;
  const paragraph = admin.locator(".cms-paragraph-block").nth(0);
  await paragraph
    .getByLabel("อัปโหลดรูปย่อหน้า 1 จากเครื่อง", { exact: true })
    .setInputFiles(fixture("paragraph.svg", "#446688"));
  await paragraph
    .getByText("อัปโหลดแล้ว 1 ภาพ กรุณาบันทึกการเปลี่ยนแปลง", { exact: true })
    .waitFor();
  await paragraph.getByLabel(/ตำแหน่งรูปย่อหน้า 1/).selectOption("right");
  await paragraph.getByLabel(/อัตราส่วนรูปย่อหน้า 1/).selectOption("1:1");
  await admin
    .getByRole("button", { name: "ย้ายย่อหน้า 1 ลง", exact: true })
    .click();
  await expect(
    admin
      .locator(".cms-paragraph-block")
      .nth(1)
      .getByLabel("English", { exact: true })
      .first(),
  ).toHaveValue(bodies.en[0]);
  checks++;
  const gallery = admin.getByLabel("อัปโหลดภาพบทความหลายภาพจากเครื่อง", {
    exact: true,
  });
  await expect(gallery).toHaveAttribute("multiple", "");
  await gallery.setInputFiles([
    fixture("gallery-one.svg", "#4a8d5b"),
    fixture("gallery-two.svg", "#9b6438"),
  ]);
  await admin
    .getByText("อัปโหลดแล้ว 2 ภาพ กรุณาบันทึกการเปลี่ยนแปลง", { exact: true })
    .waitFor();
  await expect(admin.locator(".cms-article-gallery-item")).toHaveCount(2);
  await admin
    .getByLabel("ลิงก์บทความ", { exact: false })
    .fill("revision01-full-body");
  await admin.getByLabel(/สถานะบทความ/).selectOption("published");
  await admin.getByRole("button", { name: "บันทึกบทความ", exact: true }).click();
  await admin.getByText("บันทึกบทความแล้ว", { exact: true }).waitFor();
  const saved = (await request("GET", "/admin/articles")).find(
    (article) => article.slug === "revision01-full-body",
  );
  assert.ok(saved);
  assert.equal(saved.blocks.length, 2);
  assert.equal(saved.gallery.length, 2);
  assert.equal(saved.blocks[1].align, "right");
  assert.equal(saved.blocks[1].ratio, "1:1");
  const savedUrls = [
    saved.blocks[1].image.url,
    ...saved.gallery.map((image) => image.url),
  ];
  assert.ok(savedUrls.every((url) => /^\/uploads\//.test(url)));
  checks++;
  for (const lang of ["th", "en"]) {
    await visitor.goto(runtime.origin + "/news/revision01-full-body");
    await visitor.locator(".article-paragraphs").waitFor();
    await language(visitor, lang);
    const paragraphs = await visitor
      .locator(".article-paragraphs > .article-paragraph > p")
      .allTextContents();
    assert.deepEqual(paragraphs, [bodies[lang][1], bodies[lang][0]]);
    await expect(
      visitor.locator(".article-paragraph[data-align=right]"),
    ).toHaveCount(1);
    await expect(
      visitor.locator(".article-paragraph-image[data-ratio='1:1']"),
    ).toHaveCSS("aspect-ratio", "1 / 1");
    await expect(visitor.locator(".article-gallery-image")).toHaveCount(2);
    checks++;
  }
  await shot(visitor, "revision01-full-article");
  await visitor.setViewportSize({ width: 390, height: 844 });
  await overflow(visitor, "paragraph article mobile");
  checks++;

  // Close the website from its actual dashboard controls while a visitor has an
  // article open. Existing sessions must switch to the maintenance view too.
  await navigate("ภาพรวม");
  for (const [lang, label] of [
    ["th", "ภาษาไทย"],
    ["en", "English"],
  ]) {
    await admin
      .getByLabel(`หัวข้อปิดปรับปรุง (${label})`, { exact: true })
      .fill(maintenanceTitle[lang]);
    await admin
      .getByLabel(`ข้อความปิดปรับปรุง (${label})`, { exact: false })
      .fill(maintenanceMessage[lang]);
  }
  await admin
    .getByRole("button", { name: "ปิดเว็บไซต์เพื่อปรับปรุง", exact: true })
    .click();
  await admin.getByText("เว็บไซต์ปิดปรับปรุง", { exact: true }).waitFor();
  await expect(visitor.locator(".maintenance-page")).toBeVisible({
    timeout: 15000,
  });
  await language(visitor, "en");
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(
    maintenanceTitle.en,
  );
  await expect(
    visitor.getByText(maintenanceMessage.en, { exact: true }),
  ).toBeVisible();
  checks++;
  for (const route of [
    "/",
    "/about",
    "/news",
    "/news/revision01-full-body",
    "/contact",
  ]) {
    await visitor.goto(runtime.origin + route);
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(
      maintenanceTitle.en,
    );
    await expect(
      visitor.locator(".news-card, .article, .contact-form"),
    ).toHaveCount(0);
    checks++;
  }
  await language(visitor, "th");
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(
    maintenanceTitle.th,
  );
  await expect(
    visitor.getByText(maintenanceMessage.th, { exact: true }),
  ).toBeVisible();
  await overflow(visitor, "maintenance mobile");
  const axe = await new AxeBuilder({ page: visitor })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    axe.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    })),
    [],
  );
  await shot(visitor, "revision01-maintenance-th");
  checks++;
  const blocked = await visitor.evaluate(async () => {
    const session = await (await fetch("/api/session")).json();
    const statuses = [];
    for (const [url, method, body] of [
      ["/articles", "GET"],
      ["/articles/revision01-full-body", "GET"],
      ["/contact", "POST", {}],
      ["/subscribe", "POST", {}],
    ]) {
      const response = await fetch("/api" + url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": session.csrf,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      statuses.push([response.status, (await response.json()).error]);
    }
    return { statuses, content: await (await fetch("/api/content")).json() };
  });
  assert.ok(
    blocked.statuses.every(
      ([status, code]) => status === 503 && code === "MAINTENANCE",
    ),
  );
  assert.deepEqual(Object.keys(blocked.content).sort(), [
    "adminPresentation",
    "global",
    "maintenance",
    "styles",
  ]);
  assert.equal(
    (await request("GET", "/admin/documents")).maintenance.value.enabled,
    true,
  );
  checks++;

  // Restart against the same disk data and authenticate through /admin while
  // the public website remains closed. Reopening restores the saved article.
  await adminContext.close();
  await visitorContext.close();
  await runtime.close();
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  visitorContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  admin = await adminContext.newPage();
  visitor = await visitorContext.newPage();
  for (const page of [admin, visitor]) {
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => errors.push(error.message));
  }
  await visitor.goto(runtime.origin);
  await expect(visitor.locator(".maintenance-page")).toBeVisible();
  await login();
  await expect(
    admin.getByText("เว็บไซต์ปิดปรับปรุง", { exact: true }),
  ).toBeVisible();
  const afterRestart = (await request("GET", "/admin/articles")).find(
    (article) => article.id === saved.id,
  );
  assert.deepEqual(afterRestart.blocks, saved.blocks);
  assert.deepEqual(afterRestart.gallery, saved.gallery);
  for (const url of savedUrls) {
    const response = await visitor.request.get(runtime.origin + url);
    assert.equal(response.status(), 200);
  }
  checks++;
  await admin.getByRole("button", { name: "เปิดเว็บไซต์", exact: true }).click();
  await admin.getByText("เว็บไซต์เปิดให้เข้าชม", { exact: true }).waitFor();
  await expect(visitor.locator(".maintenance-page")).toHaveCount(0, {
    timeout: 15000,
  });
  await visitor.goto(runtime.origin + "/news/revision01-full-body");
  await expect(
    visitor.locator(".article-paragraphs > .article-paragraph"),
  ).toHaveCount(2);
  checks++;

  assert.deepEqual(errors, [], "Unexpected browser errors");
  console.log(
    `PASS: ${checks} revision 01 browser checks; news geometry, icon settings, paragraphs, direct multi-image upload, maintenance, restart and preserved media`,
  );
} catch (error) {
  for (const [page, name] of [
    [admin, "admin"],
    [visitor, "visitor"],
  ]) {
    if (page && !page.isClosed())
      await page
        .screenshot({
          path: `test-results/revision01-failure-${name}.png`,
          fullPage: true,
          animations: "disabled",
        })
        .catch(() => {});
  }
  console.error("Revision browser errors:", JSON.stringify(errors));
  throw error;
} finally {
  if (browser) await browser.close();
  if (runtime) await runtime.close();
  rmSync(directory, { recursive: true, force: true });
}
