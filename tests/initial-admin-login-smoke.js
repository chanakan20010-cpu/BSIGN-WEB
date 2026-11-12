// Called by the actual Windows entry point. Never print credential contents.
import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
const [origin, file, log] = process.argv.slice(2);
export function readInitialCredentials(file) {
  const text = readFileSync(file, "utf8");
  const email = text.match(/^Username:\s*(\S+)\s*$/m)?.[1];
  const password = text.match(/^Password:\s*(\S+)\s*$/m)?.[1];
  if (!email || !password) throw Error("Initial credential fields missing");
  return { email, password };
}
if (origin && file) {
  const credentials = readInitialCredentials(file);
  const health = await fetch(origin + "/api/health");
  assert.equal(health.status, 200);
  const page = await fetch(origin + "/admin");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /id="root"/);
  const session = await fetch(origin + "/api/session");
  const cookie = session.headers.get("set-cookie").split(";")[0];
  const { csrf } = await session.json();
  const login = await fetch(origin + "/api/login", {
    method: "POST",
    headers: {
      Origin: origin,
      Cookie: cookie,
      "X-CSRF-Token": csrf,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });
  assert.equal(
    login.status,
    200,
    "Login with generated initial account failed",
  );
  const authenticatedCookie = login.headers.get("set-cookie").split(";")[0];
  const documents = await fetch(origin + "/api/admin/documents", {
    headers: { Cookie: authenticatedCookie },
  });
  assert.equal(documents.status, 200);
  if (
    log &&
    existsSync(log) &&
    readFileSync(log, "utf8").includes(credentials.password)
  )
    throw Error("A password was found in the setup log");
  console.log(
    "PASS: website, /admin and authenticated CMS using the private initial account file",
  );
}
