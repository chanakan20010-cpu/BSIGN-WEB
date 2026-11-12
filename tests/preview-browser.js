import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { startPreview } from "../server/preview.js";
const directory = mkdtempSync(path.join(tmpdir(), "bsign-setup-ui-"));
let runtime, browser;
try {
  runtime = await startPreview({ directory });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(runtime.origin + "/setup#" + runtime.token);
  await page.getByLabel("อีเมลผู้ดูแล").fill("owner@example.test");
  assert.equal(new URL(page.url()).hash, "");
  const password = randomBytes(24).toString("hex");
  await page.getByLabel("รหัสผ่านใหม่", { exact: true }).fill(password);
  await page
    .getByLabel("ยืนยันรหัสผ่าน", { exact: true })
    .fill("different-password");
  await page.getByRole("button", { name: "สร้างบัญชีและเปิดหลังบ้าน" }).click();
  await page.getByText("รหัสผ่านทั้งสองช่องต้องตรงกัน").waitFor();
  await page.getByLabel("ยืนยันรหัสผ่าน", { exact: true }).fill(password);
  await page.getByRole("button", { name: "สร้างบัญชีและเปิดหลังบ้าน" }).click();
  await page.getByRole("heading", { name: "BSIGN TECH · CMS" }).waitFor();
  assert.equal(runtime.db.prepare("SELECT count(*) n FROM users").get().n, 1);
  await page.goto(runtime.origin + "/setup#" + runtime.token);
  await expect(page).toHaveURL(runtime.origin + "/admin");
  await page.goto(runtime.origin);
  await page.locator("main h1").waitFor();
  await page.close();
  await runtime.close();
  runtime = await startPreview({ directory });
  const again = await browser.newPage();
  again.setDefaultTimeout(15000);
  await again.goto(runtime.origin + "/admin");
  await again.getByLabel("อีเมล", { exact: true }).fill("owner@example.test");
  await again.getByLabel("รหัสผ่าน", { exact: true }).fill(password);
  await again.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await again.getByRole("heading", { name: "BSIGN TECH · CMS" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: browser account creation, confirmation, CMS, setup lockout and login after preview restart",
  );
} finally {
  if (browser) await browser.close();
  if (runtime) await runtime.close();
  rmSync(directory, { recursive: true, force: true });
}
