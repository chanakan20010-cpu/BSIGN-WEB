import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { startPreview } from "../server/preview.js";
import { ensureInitialAdmin } from "../server/initial-admin.js";
import { openDb } from "../server/db.js";
import { hashPassword, verifyPassword } from "../server/security.js";
import { createApp } from "../server/app.js";

const temp = () => mkdtempSync(path.join(tmpdir(), "bsign-initial-admin-"));
function credentials(file) {
  const text = readFileSync(file, "utf8");
  const email = text.match(/^Username: ([^\r\n]+)$/m)?.[1];
  const password = text.match(/^Password: ([^\r\n]+)$/m)?.[1];
  assert.ok(email && password, "Initial credentials fields are missing");
  return { email, password };
}
async function login(origin, account) {
  const agent = request.agent(origin);
  const { csrf } = (await agent.get("/api/session")).body;
  const result = await agent
    .post("/api/login")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf)
    .send(account);
  return { agent, result };
}

test("automatic preview writes private initial credentials that log into /admin and survive restart", async () => {
  const directory = temp(),
    stateFile = path.join(directory, "readiness.json");
  let runtime;
  try {
    runtime = await startPreview({
      directory,
      stateFile,
      provisionInitialAdmin: true,
    });
    assert.equal(runtime.initialAdmin.status, "created");
    const file = path.join(directory, "initial-admin.txt");
    assert.equal(runtime.initialAdmin.file, file);
    const account = credentials(file);
    assert.equal(account.email, "admin@bsign.local");
    assert.ok(
      account.password.length >= 32,
      "Initial password should have at least 192 random bits",
    );
    const hash = runtime.db
      .prepare("SELECT password FROM users")
      .get().password;
    assert.ok(
      await verifyPassword(account.password, hash),
      "Stored hash should accept initial password",
    );
    assert.ok(
      !JSON.stringify(runtime.initialAdmin).includes(account.password),
      "Summary must not disclose password",
    );
    assert.ok(
      !readFileSync(stateFile, "utf8").includes(account.password),
      "Readiness must not disclose password",
    );
    if (process.platform !== "win32")
      assert.equal(statSync(file).mode & 0o777, 0o600);
    const { agent, result } = await login(runtime.origin, account);
    assert.equal(result.status, 200);
    assert.equal((await agent.get("/api/admin/documents")).status, 200);
    for (const url of [
      "/.data/initial-admin.txt",
      "/initial-admin.txt",
      "/uploads/../initial-admin.txt",
    ]) {
      const response = await request(runtime.origin).get(url);
      assert.ok(
        !response.text.includes(account.password),
        "HTTP response must not expose credential file",
      );
    }
    const saved = readFileSync(file),
      before = statSync(file).mtimeMs;
    await runtime.close();
    runtime = null;
    runtime = await startPreview({ directory, provisionInitialAdmin: true });
    assert.equal(runtime.initialAdmin.status, "existing");
    assert.ok(
      readFileSync(file).equals(saved),
      "Restart must not rewrite initial credentials",
    );
    assert.equal(statSync(file).mtimeMs, before);
    assert.equal(runtime.db.prepare("SELECT count(*) n FROM users").get().n, 1);
    assert.equal((await login(runtime.origin, account)).result.status, 200);
  } finally {
    if (runtime) await runtime.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("automatic preview preserves a pre-existing manual administrator and site data", async () => {
  const directory = temp(),
    db = openDb(directory);
  const account = {
    email: "existing@example.test",
    password: randomBytes(24).toString("hex"),
  };
  const hash = await hashPassword(account.password);
  db.prepare("INSERT INTO users(email,password) VALUES(?,?)").run(
    account.email,
    hash,
  );
  db.prepare("INSERT INTO documents(key,value) VALUES(?,?)").run(
    "custom-persistent-record",
    JSON.stringify({ saved: "keep this content" }),
  );
  db.close();
  let runtime;
  try {
    runtime = await startPreview({ directory, provisionInitialAdmin: true });
    assert.equal(runtime.initialAdmin.status, "existing-no-file");
    assert.equal(existsSync(path.join(directory, "initial-admin.txt")), false);
    assert.equal(runtime.db.prepare("SELECT count(*) n FROM users").get().n, 1);
    assert.ok(
      runtime.db.prepare("SELECT password FROM users").get().password === hash,
      "Existing password hash must be preserved",
    );
    assert.equal(
      runtime.db
        .prepare(
          "SELECT value FROM documents WHERE key='custom-persistent-record'",
        )
        .get().value,
      JSON.stringify({ saved: "keep this content" }),
    );
    assert.equal((await login(runtime.origin, account)).result.status, 200);
  } finally {
    if (runtime) await runtime.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a leftover initial credential file is never overwritten when database has no users", async () => {
  const directory = temp(),
    file = path.join(directory, "initial-admin.txt");
  writeFileSync(file, "existing file must remain unchanged", { mode: 0o600 });
  try {
    await assert.rejects(
      startPreview({ directory, provisionInitialAdmin: true }),
      { code: "INITIAL_ADMIN_FILE_EXISTS" },
    );
    assert.equal(
      readFileSync(file, "utf8"),
      "existing file must remain unchanged",
    );
    const db = openDb(directory);
    try {
      assert.equal(db.prepare("SELECT count(*) n FROM users").get().n, 0);
    } finally {
      db.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("two first preview launches create one account and one matching credential file", async () => {
  const directory = temp();
  const runtimes = [];
  try {
    const settled = await Promise.allSettled([
      startPreview({ directory, provisionInitialAdmin: true }),
      startPreview({ directory, provisionInitialAdmin: true }),
    ]);
    for (const result of settled)
      if (result.status === "fulfilled") runtimes.push(result.value);
    assert.equal(runtimes.length, 2);
    assert.deepEqual(runtimes.map((r) => r.initialAdmin.status).sort(), [
      "created",
      "existing",
    ]);
    assert.equal(
      runtimes[0].db.prepare("SELECT count(*) n FROM users").get().n,
      1,
    );
    const account = credentials(path.join(directory, "initial-admin.txt"));
    for (const runtime of runtimes)
      assert.equal((await login(runtime.origin, account)).result.status, 200);
  } finally {
    for (const runtime of runtimes) await runtime.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a failed database insert removes only the credential file created by that attempt", async () => {
  const directory = temp(),
    db = openDb(directory);
  try {
    db.exec(
      "CREATE TRIGGER reject_first_admin BEFORE INSERT ON users BEGIN SELECT RAISE(ABORT,'TEST_INSERT_REJECTED'); END;",
    );
    await assert.rejects(
      ensureInitialAdmin(db, directory),
      /TEST_INSERT_REJECTED/,
    );
    assert.equal(existsSync(path.join(directory, "initial-admin.txt")), false);
    assert.equal(db.prepare("SELECT count(*) n FROM users").get().n, 0);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("normal production app and default preview never generate an implicit admin", async () => {
  const productionDirectory = temp(),
    previewDirectory = temp();
  const before = process.env.NODE_ENV;
  let production, runtime;
  try {
    process.env.NODE_ENV = "production";
    production = createApp({
      directory: productionDirectory,
      origin: "https://example.test",
      secure: true,
    });
    assert.equal(
      production.db.prepare("SELECT count(*) n FROM users").get().n,
      0,
    );
    assert.equal(
      existsSync(path.join(productionDirectory, "initial-admin.txt")),
      false,
    );
    assert.equal((await request(production.app).get("/api/setup")).status, 404);
    runtime = await startPreview({ directory: previewDirectory });
    assert.equal(runtime.initialAdmin, undefined);
    assert.equal(runtime.db.prepare("SELECT count(*) n FROM users").get().n, 0);
    assert.equal(
      existsSync(path.join(previewDirectory, "initial-admin.txt")),
      false,
    );
  } finally {
    if (before === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = before;
    production?.db.close();
    if (runtime) await runtime.close();
    rmSync(productionDirectory, { recursive: true, force: true });
    rmSync(previewDirectory, { recursive: true, force: true });
  }
});
