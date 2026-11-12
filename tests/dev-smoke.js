import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const temp = mkdtempSync(path.join(tmpdir(), "bsign-dev-"));
const origin = "http://localhost:3218";
const child = spawn(process.execPath, ["server/index.js", "--dev"], {
  env: { ...process.env, PORT: "3218", APP_ORIGIN: origin, DATA_DIR: temp },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser;
let output = "";
child.stdout.on("data", (b) => (output += b));
child.stderr.on("data", (b) => (output += b));
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  await page.locator("main h1").waitFor();
  assert.deepEqual(errors, []);
  assert.equal(await page.locator('script[src="/src/main.jsx"]').count(), 1);
  console.log(
    "PASS: Vite development page and API work with an existing dist build",
  );
} finally {
  if (browser) await browser.close();
  child.kill("SIGTERM");
  await new Promise((r) => child.on("close", r));
  rmSync(temp, { recursive: true, force: true });
}
