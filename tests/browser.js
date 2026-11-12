import AxeBuilder from "@axe-core/playwright";
import { chromium, expect } from "@playwright/test";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
const temp = mkdtempSync(path.join(tmpdir(), "bsign-browser-"));
const port = 3217,
  origin = `http://localhost:${port}`;
const { app, db } = createApp({ directory: temp, origin, limits: false });
app.use(express.static("dist"));
app.get("/{*path}", (_q, r) => r.sendFile(path.resolve("dist/index.html")));
const server = app.listen(port, "127.0.0.1");
const password = randomBytes(24).toString("hex");
db.prepare("INSERT INTO users(email,password) VALUES(?,?)").run(
  "browser@example.test",
  await hashPassword(password),
);
mkdirSync("test-results", { recursive: true });
let browser;
const failures = [];
let checks = 0;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => failures.push(e.message));
  for (const width of [1440, 768, 390])
    for (const lang of ["th", "en"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(origin);
      await page
        .getByRole("button", { name: lang.toUpperCase(), exact: true })
        .click();
      for (const route of [
        "/",
        "/about",
        "/news",
        "/news/company-launch",
        "/contact",
      ]) {
        await page.goto(origin + route);
        await page.locator("main h1").waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator("html").getAttribute("lang"), lang);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        assert.equal(overflow, false, `${route} ${lang} ${width} overflow`);
        const broken = await page
          .locator("img")
          .evaluateAll(
            (imgs) =>
              imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
          );
        assert.equal(broken, 0);
        const svgImagesOk = await page
          .locator("svg image")
          .evaluateAll(async (els) =>
            Promise.all(
              els.map(
                (el) =>
                  new Promise((resolve) => {
                    const image = new Image();
                    image.onload = () => resolve(true);
                    image.onerror = () => resolve(false);
                    image.src = el.getAttribute("href");
                  }),
              ),
            ),
          );
        assert.ok(svgImagesOk.every(Boolean), "Reference image could not load");
        checks++;
        if (width === 1440 && lang === "th")
          await page.screenshot({
            path: `test-results/${route === "/" ? "home" : route.replaceAll("/", "-")}-desktop.png`,
            fullPage: true,
          });
        if (width === 390 && lang === "th" && route === "/")
          await page.screenshot({
            path: "test-results/home-mobile.png",
            fullPage: true,
          });
      }
    }
  console.log("PASS: 30 page/language/viewport checks, images and overflow");
  for (const route of [
    "/",
    "/about",
    "/news",
    "/news/company-launch",
    "/contact",
  ]) {
    await page.goto(origin + route);
    await page.locator("main h1").waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      route + " accessibility",
    );
    checks++;
  }
  console.log("PASS: WCAG A/AA automated checks on 5 public pages");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(origin + "/news");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByRole("searchbox").count();
  await page.locator("#news-search").fill("Microservices");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForURL(/q=Microservices/);
  await page.locator(".news-card").first().waitFor();
  await expect(page.locator(".news-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Company news", exact: true }).click();
  await page.getByText("No results found", { exact: true }).waitFor();
  checks += 2;
  console.log("Search/filter complete");
  await page.goto(origin + "/contact");
  await page.getByLabel("Full name").fill("Browser Test");
  await page.getByLabel("Contact email").fill("browser-form@example.test");
  await page
    .getByLabel("Message", { exact: false })
    .fill("A message submitted in Chromium.");
  await page.locator("input[name=consent]").check();
  await page.getByRole("button", { name: "Send message" }).click();
  await page
    .getByText("Your message has been saved. Thank you for contacting us.")
    .waitFor();
  assert.equal(db.prepare("SELECT count(*) n FROM contacts").get().n, 1);
  checks++;
  console.log("Contact complete");
  await page.goto(origin + "/admin");
  await page.getByLabel("อีเมล", { exact: true }).fill("browser@example.test");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.getByRole("heading", { name: "BSIGN TECH · CMS" }).waitFor();
  await page
    .getByLabel("ไทย", { exact: true })
    .first()
    .fill("หัวข้อแก้ไขผ่านหลังบ้าน");
  await page
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  await page.getByText("บันทึกแล้ว", { exact: true }).waitFor();
  checks++;
  await page.getByRole("button", { name: "รูปภาพและไฟล์", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "browser.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>',
    ),
  });
  await page.getByLabel("แหล่งที่มา / URL").fill("Created in browser test");
  await page.getByLabel("สิทธิ์การใช้งาน / เจ้าของ").fill("Test fixture");
  await page.getByRole("button", { name: "อัปโหลดและตรวจไฟล์" }).click();
  await page.getByText("อัปโหลดแล้ว", { exact: true }).waitFor();
  checks++;
  await page.getByRole("button", { name: "หน้าแรก", exact: true }).click();
  await page.getByLabel("เลือกจากคลัง").first().selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  await page.getByText("บันทึกแล้ว", { exact: true }).waitFor();
  checks++;
  await page.getByRole("button", { name: "ไอคอน", exact: true }).click();
  await page.getByLabel("คลังไอคอน").selectOption("Rocket");
  await page.getByLabel("สีไอคอน (SVG / ไอคอนสำเร็จรูป)").fill("#123456");
  await page
    .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
    .click();
  await page.getByText("บันทึกแล้ว", { exact: true }).waitFor();
  checks++;
  const mutate = async (key, patch) =>
    page.evaluate(
      async ({ key, patch }) => {
        const s = await (await fetch("/api/session")).json();
        const d = await (await fetch("/api/admin/documents")).json();
        const r = await fetch("/api/admin/documents/" + key, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": s.csrf,
          },
          body: JSON.stringify({ revision: d[key].revision, patch }),
        });
        if (!r.ok) throw Error(await r.text());
      },
      { key, patch },
    );
  await mutate("styles", {
    body: {
      size: 17,
      tablet: 16,
      mobile: 15,
      spacing: 1.2,
      line: 1.8,
      color: "#445566",
    },
    button: { size: 16, weight: 600 },
  });
  await mutate("home", {
    cta: { en: "Edited button", th: "ปุ่มที่แก้ไข" },
    ctaHref: "/contact",
  });
  for (const route of ["/", "/about", "/news", "/contact"]) {
    await page.goto(origin + route);
    await page.locator(".type-body").first().waitFor();
    const s = await page
      .locator(".type-body")
      .first()
      .evaluate((el) => {
        const c = getComputedStyle(el);
        return [c.fontSize, c.letterSpacing, c.lineHeight, c.color];
      });
    assert.deepEqual(s, ["17px", "1.2px", "30.6px", "rgb(68, 85, 102)"]);
    checks++;
  }
  await page.goto(origin);
  await page.getByRole("button", { name: "TH", exact: true }).click();
  await page.getByRole("heading", { name: /หัวข้อแก้ไขผ่านหลังบ้าน/ }).waitFor();
  assert.match(
    await page.locator(".hero img").getAttribute("src"),
    /^\/uploads\//,
  );
  assert.equal(
    await page
      .locator(".hero .icon")
      .evaluate((e) => getComputedStyle(e).color),
    "rgb(18, 52, 86)",
  );
  checks += 2;
  await page.getByRole("link", { name: "ปุ่มที่แก้ไข", exact: true }).click();
  await page.waitForURL("**/contact");
  checks++;
  await page.getByLabel("ชื่อ-นามสกุล").fill("ผู้ทดสอบ ภาษาไทย");
  await page.getByLabel("อีเมลสำหรับการติดต่อ").fill("thai@example.test");
  await page
    .locator("textarea[name=message]")
    .fill("ทดสอบการส่งข้อความภาษาไทยผ่านเบราว์เซอร์");
  await page.locator("input[name=consent]").check();
  await page.getByRole("button", { name: "ส่งข้อความติดต่อ" }).click();
  await page.getByText("บันทึกข้อความของคุณแล้ว ขอบคุณที่ติดต่อเรา").waitFor();
  checks++;
  await mutate("news", { pageSize: 1 });
  await page.goto(origin + "/news");
  await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
  await page.waitForURL(/page=2/);
  await expect(page.locator(".news-card")).toHaveCount(1);
  checks++;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await page.getByRole("button", { name: "เปิดเมนู", exact: true }).click();
  await page
    .locator("#navigation")
    .getByRole("link", { name: "เกี่ยวกับเรา", exact: true })
    .click();
  await page.waitForURL("**/about");
  await expect(page.locator(".mobile-menu")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  checks++;
  await page.goto(origin);
  await page.locator(".skip").waitFor({ state: "attached" });
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "skip",
  );
  checks++;
  assert.deepEqual(failures, []);
  console.log(
    `PASS: ${checks} browser checks; forms, CMS edit/upload/icons, navigation, computed styles, keyboard; no JS page errors`,
  );
} finally {
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
  db.close();
  rmSync(temp, { recursive: true, force: true });
}
