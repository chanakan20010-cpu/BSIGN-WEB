import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { startPreview } from "../server/preview.js";
import { readInitialCredentials } from "./initial-admin-login-smoke.js";
const directory = mkdtempSync(path.join(tmpdir(), "bsign-file-account-ui-"));
let runtime, browser;
try {
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  const file = runtime.initialAdmin.file;
  const saved = readFileSync(file);
  const account = readInitialCredentials(file);
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const errors = [];
  async function openAndLogin() {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.setDefaultTimeout(15000);
    await page.goto(runtime.origin);
    await page.locator("main h1").waitFor();
    // Follow exactly the user's workflow: append /admin to the website URL.
    await page.goto(runtime.origin + "/admin");
    await page.getByLabel("อีเมล", { exact: true }).fill(account.email);
    await page.getByLabel("รหัสผ่าน", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
    await page.getByRole("heading", { name: "BSIGN TECH · CMS" }).waitFor();
    await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).waitFor();
    await context.close();
  }
  await openAndLogin();
  await runtime.close();
  runtime = await startPreview({ directory, provisionInitialAdmin: true });
  if (!readFileSync(file).equals(saved))
    throw Error("Initial credential file changed after restart");
  await openAndLogin();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: automatic account file, homepage -> /admin -> CMS, logout and login again after restart in a real browser",
  );
} finally {
  if (browser) await browser.close();
  if (runtime) await runtime.close();
  rmSync(directory, { recursive: true, force: true });
}
