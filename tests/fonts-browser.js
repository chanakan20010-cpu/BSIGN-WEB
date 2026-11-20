import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { startPreview } from "../server/preview.js";
import { readInitialCredentials } from "./initial-admin-login-smoke.js";
import { builtInFonts, requestedFonts } from "../src/font-catalog.js";

// Private fixtures exercise the shipped UI without reading a user's database.
const directory = mkdtempSync(path.join(tmpdir(), "bsign-font-ui-"));
mkdirSync("test-results", { recursive: true });
const fontLabel = "Custom Thai UI Font";
const sourceFont = readFileSync(
  new URL(
    "../node_modules/@fontsource/itim/files/itim-thai-400-normal.woff2",
    import.meta.url,
  ),
);
let runtime, browser, adminContext, visitorContext, admin, visitor, credentials;
let checks = 0;
const pageErrors = [];

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
async function stylesPanel() {
  const menu = admin.getByRole("button", { name: "เปิดเมนูจัดการ", exact: true });
  if (
    (await menu.isVisible()) &&
    (await menu.getAttribute("aria-expanded")) !== "true"
  )
    await menu.click();
  await admin
    .locator(".cms-navigation")
    .getByRole("button", { name: "สไตล์เว็บไซต์", exact: true })
    .click();
  await admin
    .getByRole("group", { name: "ชนิดตัวอักษร", exact: true })
    .getByRole("button", { name: "หัวข้อใหญ่", exact: true })
    .click();
}
async function libraryPanel() {
  await stylesPanel();
  await admin
    .locator(".cms-design-tabs")
    .getByRole("button", { name: "คลังฟอนต์", exact: true })
    .click();
  await expect(admin.getByTestId("font-library")).toBeVisible();
  await expect(
    admin.getByRole("button", { name: "โหลดรายการฟอนต์ใหม่", exact: true }),
  ).toBeEnabled();
}
async function saveStyles() {
  const response = admin.waitForResponse(
    (result) =>
      result.url().endsWith("/api/admin/documents/styles") &&
      result.request().method() === "PATCH",
  );
  const button = admin.getByRole("button", {
    name: "บันทึกการเปลี่ยนแปลง",
    exact: true,
  });
  await button.click();
  assert.ok((await response).ok(), "style save succeeds");
  await expect(button).toBeDisabled();
}
async function overflow(page, name) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    name + " fits the viewport",
  );
}
async function actualCustomFace(page, family, selector) {
  const element = page.locator(selector).first();
  await expect(element).toBeVisible();
  await expect
    .poll(() => element.evaluate((node) => getComputedStyle(node).fontFamily))
    .toContain(family);
  const loaded = await element.evaluate(async (node, expected) => {
    const css = getComputedStyle(node);
    const matching = await document.fonts.load(
      `${css.fontWeight} ${css.fontSize} ${JSON.stringify(expected)}`,
      "ก",
    );
    await document.fonts.ready;
    return {
      matched: matching.length,
      status: matching.map((face) => face.status),
      registered: Array.from(document.fonts)
        .filter(
          (face) =>
            face.family.replaceAll('"', "").replaceAll("'", "") === expected,
        )
        .map((face) => ({ status: face.status, weight: face.weight })),
    };
  }, family);
  assert.ok(loaded.matched > 0, "custom font matches a real FontFace");
  assert.ok(
    loaded.status.every((status) => status === "loaded"),
    "custom font bytes have loaded",
  );
  assert.deepEqual(loaded.registered, [{ status: "loaded", weight: "400" }]);
  // Chromium reports the actual font used for glyphs. Itim's internal name is
  // distinct from the site's Noto Sans Thai fallback, proving real rendering.
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const { root } = await session.send("DOM.getDocument");
    const { nodeId } = await session.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector,
    });
    const { fonts } = await session.send("CSS.getPlatformFontsForNode", {
      nodeId,
    });
    assert.ok(
      fonts.some(
        (font) =>
          font.isCustomFont &&
          font.familyName === "Itim" &&
          font.glyphCount > 0,
      ),
      "Thai glyphs render with the uploaded Itim file",
    );
  } finally {
    await session.detach();
  }
}
async function publicHero(width, family) {
  await visitor.setViewportSize({ width, height: 1000 });
  await visitor.goto(runtime.origin);
  await visitor.locator('header .languages button[lang="th"]').click();
  await expect(visitor.locator("html")).toHaveAttribute("lang", "th");
  await actualCustomFace(visitor, family, ".hero h1 > span");
  await overflow(visitor, `${width}px public hero`);
  await visitor.screenshot({
    path: `test-results/fonts-public-${width}.png`,
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
  await connect();
  const original = (await request("GET", "/admin/documents")).styles.value.hero;
  await stylesPanel();
  const initialChoices = await admin
    .getByLabel("ฟอนต์", { exact: true })
    .locator("option")
    .evaluateAll((options) => options.map((option) => option.value));
  assert.deepEqual(
    initialChoices,
    builtInFonts.map((font) => font.family),
  );
  for (const family of ["Noto Sans Thai", "Noto Sans", "sans-serif", "serif"])
    assert.ok(
      initialChoices.includes(family),
      `legacy ${family} remains available`,
    );
  assert.equal(requestedFonts.length, 20);
  checks++;

  await libraryPanel();
  const cards = admin.locator(".cms-font-bundled-grid > article");
  await expect(cards).toHaveCount(22);
  assert.deepEqual(
    await cards.evaluateAll((items) =>
      items.map((item) => item.dataset.fontFamily),
    ),
    builtInFonts.filter((font) => font.package).map((font) => font.family),
  );
  const previewFaces = await admin.evaluate(
    async (families) =>
      Promise.all(
        families.map(async (family) => {
          const loaded = await document.fonts.load(
            `400 28px ${JSON.stringify(family)}`,
            "ก",
          );
          return {
            family,
            count: loaded.length,
            statuses: loaded.map((face) => face.status),
          };
        }),
      ),
    requestedFonts.map((font) => font.family),
  );
  assert.ok(
    previewFaces.every(
      (font) =>
        font.count > 0 && font.statuses.every((status) => status === "loaded"),
    ),
    "all twenty Thai preview faces actually load",
  );
  for (const family of ["Chonburi", "Itim"]) {
    const weights = await admin.evaluate(
      (expected) =>
        Array.from(document.fonts)
          .filter((face) => face.family.replaceAll('"', "") === expected)
          .map((face) => face.weight),
      family,
    );
    assert.ok(
      weights.length > 0 && weights.every((weight) => weight === "400"),
      `${family} ships its real 400 weight only`,
    );
  }
  await overflow(admin, "desktop font library");
  await admin.screenshot({
    path: "test-results/fonts-library-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  checks++;

  await admin.setViewportSize({ width: 390, height: 900 });
  await overflow(admin, "mobile font library");
  await expect(
    admin
      .getByTestId("font-library")
      .getByText("เพิ่มฟอนต์จากอุปกรณ์", { exact: true }),
  ).toBeVisible();
  await admin.screenshot({
    path: "test-results/fonts-library-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await admin.setViewportSize({ width: 1440, height: 1000 });
  checks++;

  const file = admin.getByTestId("font-library").locator('input[name="file"]');
  await file.setInputFiles({
    name: "invalid.woff2",
    mimeType: "font/woff2",
    buffer: Buffer.from("This is not a font file"),
  });
  await admin.getByRole("button", { name: "อัปโหลดฟอนต์", exact: true }).click();
  await expect(admin.getByRole("alert")).toContainText("ไม่สามารถอ่านฟอนต์นี้ได้");
  assert.deepEqual(await request("GET", "/admin/fonts"), []);
  checks++;

  await file.setInputFiles({
    name: "ui-custom-thai.woff2",
    mimeType: "font/woff2",
    buffer: sourceFont,
  });
  await admin.locator('input[name="label"]').fill(fontLabel);
  await admin.locator(".cms-font-upload-details > summary").click();
  await admin
    .locator('input[name="source"]')
    .fill("https://fontsource.org/fonts/itim");
  await admin
    .locator('textarea[name="license"]')
    .fill("SIL Open Font License 1.1");
  const uploaded = admin.waitForResponse(
    (result) =>
      result.url().endsWith("/api/admin/fonts") &&
      result.request().method() === "POST",
  );
  await admin.getByRole("button", { name: "อัปโหลดฟอนต์", exact: true }).click();
  const uploadResponse = await uploaded;
  assert.equal(uploadResponse.status(), 201);
  const font = await uploadResponse.json();
  assert.equal(font.metadata.familyName, "Itim");
  const custom = admin.locator(`[data-font-id="${font.id}"]`);
  await expect(
    custom.getByRole("heading", { name: fontLabel, exact: true }),
  ).toBeVisible();
  await actualCustomFace(
    admin,
    font.family,
    `[data-font-id="${font.id}"] .cms-font-preview`,
  );
  await custom.locator(".cms-font-metadata > summary").click();
  await expect(custom).toContainText("ui-custom-thai.woff2");
  await expect(custom).toContainText("SIL Open Font License 1.1");
  checks++;

  await stylesPanel();
  await admin.getByLabel("ฟอนต์", { exact: true }).selectOption(font.family);
  await admin.getByLabel("น้ำหนักตัวอักษร", { exact: true }).fill("400");
  await actualCustomFace(
    admin,
    font.family,
    '.cms-style-preview-paper .type-hero[data-selected="true"]',
  );
  assert.deepEqual(
    (await request("GET", "/admin/documents")).styles.value.hero,
    original,
    "live preview remains an unsaved draft",
  );
  await visitor.goto(runtime.origin);
  await expect
    .poll(() =>
      visitor
        .locator(".hero h1")
        .evaluate((node) => getComputedStyle(node).fontFamily),
    )
    .not.toContain(font.family);
  checks++;

  await saveStyles();
  const saved = (await request("GET", "/admin/documents")).styles.value.hero;
  assert.equal(saved.font, font.family);
  assert.equal(saved.weight, 400);
  await publicHero(1440, font.family);
  await publicHero(390, font.family);
  checks++;

  await libraryPanel();
  const used = admin.locator(`[data-font-id="${font.id}"]`);
  await expect(used.getByText("กำลังใช้งาน", { exact: true })).toBeVisible();
  await expect(
    used.getByRole("button", { name: `ลบฟอนต์ ${fontLabel}`, exact: true }),
  ).toBeDisabled();
  await expect(used.locator(".cms-font-usage")).toContainText("รูปแบบตัวอักษร");
  const metadata = (await request("GET", "/admin/fonts"))[0];
  assert.equal(metadata.inUse, true);
  assert.deepEqual(metadata.usedIn, ["styles"]);
  checks++;

  await adminContext.close();
  await visitorContext.close();
  await runtime.close();
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  await connect();
  assert.deepEqual(
    (await request("GET", "/admin/documents")).styles.value.hero,
    saved,
  );
  assert.deepEqual((await request("GET", "/admin/fonts"))[0].id, font.id);
  await publicHero(1440, font.family);
  await publicHero(390, font.family);
  assert.equal(
    (await visitor.request.get(runtime.origin + font.url)).status(),
    200,
  );
  checks++;

  await stylesPanel();
  await admin.getByLabel("ฟอนต์", { exact: true }).selectOption(original.font);
  await admin
    .getByLabel("น้ำหนักตัวอักษร", { exact: true })
    .fill(String(original.weight));
  await saveStyles();
  assert.deepEqual(
    (await request("GET", "/admin/documents")).styles.value.hero,
    original,
  );
  await libraryPanel();
  const released = admin.locator(`[data-font-id="${font.id}"]`);
  await expect(
    released.getByRole("button", { name: `ลบฟอนต์ ${fontLabel}`, exact: true }),
  ).toBeEnabled();
  await released
    .getByRole("button", { name: `ลบฟอนต์ ${fontLabel}`, exact: true })
    .click();
  const deletion = admin.waitForResponse(
    (result) =>
      result.url().endsWith(`/api/admin/fonts/${font.id}`) &&
      result.request().method() === "DELETE",
  );
  await released
    .getByRole("button", { name: "ยืนยันลบฟอนต์", exact: true })
    .click();
  assert.equal((await deletion).status(), 200);
  await expect(released).toHaveCount(0);
  assert.deepEqual(await request("GET", "/fonts"), []);
  // A fresh request avoids the immutable browser cache for the deleted asset.
  assert.equal(
    (
      await visitor.request.get(runtime.origin + font.url, {
        headers: { "Cache-Control": "no-cache" },
      })
    ).status(),
    404,
  );
  await stylesPanel();
  assert.equal(
    await admin
      .getByLabel("ฟอนต์", { exact: true })
      .locator(`option[value="${font.family}"]`)
      .count(),
    0,
  );
  checks++;

  assert.deepEqual(pageErrors, [], "unexpected browser errors");
  console.log(
    `PASS: ${checks} font browser checks; 20 local Thai faces, upload validation, live preview, actual custom glyph rendering, desktop/mobile, restart and in-use deletion protection`,
  );
} catch (error) {
  let safe = String(error.stack || error);
  for (const secret of [
    credentials?.password,
    credentials?.email,
    runtime?.token,
  ])
    if (secret) safe = safe.replaceAll(secret, "[REDACTED]");
  if (process.env.GITHUB_ACTIONS)
    console.error(
      "::error title=Font browser regression::" +
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
          path: `test-results/fonts-failure-${name}.png`,
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
