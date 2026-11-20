import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { brotliCompressSync, inflateSync } from "node:zlib";
import request from "supertest";
import {
  builtInFonts,
  requestedFonts,
  isAllowedFontFamily,
} from "../src/font-catalog.js";
import {
  MAX_FONT_BYTES,
  MAX_SFNT_BYTES,
  validateFontFile,
} from "../server/font-library.js";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";

const fixturePath = (extension) =>
  new URL(
    `../node_modules/@fontsource/noto-sans-thai/files/noto-sans-thai-thai-400-normal.${extension}`,
    import.meta.url,
  );
const fontBytes = (extension = "woff2") => readFileSync(fixturePath(extension));
const rejectsFont = (bytes, extension, code = "FONT_INVALID") =>
  assert.throws(
    () => validateFontFile(bytes, extension),
    (error) => error.status === 400 && error.code === code,
  );

// Reconstruct the original TrueType table directory from the installed WOFF,
// so the TTF test uses a real font and does not depend on operating-system fonts.
function toTrueType(woff) {
  const tables = woff.readUInt16BE(12);
  const result = Buffer.alloc(woff.readUInt32BE(16));
  result.writeUInt32BE(woff.readUInt32BE(4), 0);
  result.writeUInt16BE(tables, 4);
  const power = 2 ** Math.floor(Math.log2(tables));
  result.writeUInt16BE(power * 16, 6);
  result.writeUInt16BE(Math.log2(power), 8);
  result.writeUInt16BE(tables * 16 - power * 16, 10);
  let offset = 12 + tables * 16;
  for (let i = 0; i < tables; i++) {
    const input = 44 + i * 20,
      output = 12 + i * 16;
    const start = woff.readUInt32BE(input + 4),
      compressed = woff.readUInt32BE(input + 8),
      length = woff.readUInt32BE(input + 12);
    const bytes = woff.subarray(start, start + compressed);
    woff.copy(result, output, input, input + 4);
    result.writeUInt32BE(woff.readUInt32BE(input + 16), output + 4);
    result.writeUInt32BE(offset, output + 8);
    result.writeUInt32BE(length, output + 12);
    (compressed < length ? inflateSync(bytes) : bytes).copy(result, offset);
    offset += Math.ceil(length / 4) * 4;
  }
  return result;
}

test("all twenty requested Thai families ship real local weights, styles and full license notices", () => {
  assert.equal(requestedFonts.length, 20);
  assert.equal(new Set(requestedFonts.map((font) => font.family)).size, 20);
  const css = readFileSync(
    new URL("../src/font-library.css", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(css, /https?:\/\/|fonts\.googleapis/);
  const inventory = JSON.parse(
    readFileSync(
      new URL("../public/font-licenses/index.json", import.meta.url),
    ),
  );
  for (const font of builtInFonts.filter((entry) => entry.package)) {
    const packageDirectory = new URL(
      `../node_modules/${font.package}/`,
      import.meta.url,
    );
    const metadata = JSON.parse(
      readFileSync(new URL("metadata.json", packageDirectory)),
    );
    assert.equal(metadata.family, font.family);
    assert.deepEqual(font.weights, metadata.weights);
    assert.deepEqual([...font.styles].sort(), [...metadata.styles].sort());
    for (const style of metadata.styles)
      for (const weight of metadata.weights) {
        const name = `${weight}${style === "italic" ? "-italic" : ""}.css`;
        assert.ok(css.includes(`@import "${font.package}/${name}";`));
        assert.ok(existsSync(new URL(name, packageDirectory)));
      }
    const entry = inventory.find((item) => item.family === font.family);
    assert.equal(entry.license, "OFL-1.1");
    const shippedLicense = readFileSync(
      new URL(`../public${entry.licenseUrl}`, import.meta.url),
    );
    assert.deepEqual(
      shippedLicense,
      readFileSync(new URL("LICENSE", packageDirectory)),
    );
    assert.equal(
      createHash("sha256").update(shippedLicense).digest("hex"),
      entry.licenseSha256,
    );
  }
  for (const unsafe of [
    "Arial; color:red",
    '";src:url(https://example.test)',
    "../font",
    "BSIGN Custom ../../etc/passwd",
  ])
    assert.equal(isAllowedFontFamily(unsafe), false);
});

test("parser reads actual Thai glyphs and metadata in WOFF2, WOFF and TrueType", () => {
  for (const [extension, bytes] of [
    ["woff2", fontBytes()],
    ["woff", fontBytes("woff")],
    ["ttf", toTrueType(fontBytes("woff"))],
  ]) {
    const result = validateFontFile(bytes, extension);
    assert.equal(result.format, extension);
    assert.equal(result.metadata.familyName, "Noto Sans Thai");
    assert.equal(result.style, "normal");
    assert.equal(result.weight, 400);
    assert.ok(result.metadata.numGlyphs > 100);
    assert.ok(result.metadata.unitsPerEm > 0);
  }
});

test("parser rejects malformed headers, MIME/extension mismatch, table overflow and truncated compressed data", () => {
  for (const extension of ["woff", "woff2", "ttf", "otf"]) {
    rejectsFont(Buffer.from("<html>pretend font</html>"), extension);
    const signature = {
      woff: "wOFF",
      woff2: "wOF2",
      ttf: "\u0000\u0001\u0000\u0000",
      otf: "OTTO",
    }[extension];
    for (let size = 4; size < 48; size++) {
      const bytes = Buffer.alloc(size);
      bytes.write(signature, "latin1");
      rejectsFont(bytes, extension);
    }
  }
  rejectsFont(fontBytes(), "ttf");
  rejectsFont(fontBytes(), "svg", "FONT_FORMAT");
  rejectsFont(Buffer.from("ttcf000000000000"), "ttf", "FONT_COLLECTION");
  rejectsFont(Buffer.alloc(MAX_FONT_BYTES + 1), "woff2", "FONT_TOO_LARGE");
  for (const extension of ["woff", "woff2"]) {
    const bytes = fontBytes(extension);
    rejectsFont(bytes.subarray(0, bytes.length - 1), extension);
    const expanded = Buffer.from(bytes);
    expanded.writeUInt32BE(MAX_SFNT_BYTES + 1, 16);
    rejectsFont(expanded, extension, "FONT_EXPANDED_SIZE");
  }
  const ttf = toTrueType(fontBytes("woff"));
  ttf.writeUInt32BE(0xffffffff, 20);
  rejectsFont(ttf, "ttf");
  const woff = fontBytes("woff");
  woff.writeUInt32BE(0xffffffff, 52);
  rejectsFont(woff, "woff");
});

test("actual WOFF2 decompression has a limit even when its header claims a tiny font", () => {
  // A one-table WOFF2 directory declares one output byte while the Brotli
  // stream actually expands past the allowed limit. Header-only checks miss it.
  const compressed = brotliCompressSync(Buffer.alloc(MAX_SFNT_BYTES + 1));
  const bytes = Buffer.alloc(50 + compressed.length);
  bytes.write("wOF2");
  bytes.writeUInt32BE(0x00010000, 4);
  bytes.writeUInt32BE(bytes.length, 8);
  bytes.writeUInt16BE(1, 12);
  bytes.writeUInt32BE(32, 16);
  bytes.writeUInt32BE(compressed.length, 20);
  bytes[48] = 0; // cmap, no transform
  bytes[49] = 1;
  compressed.copy(bytes, 50);
  rejectsFont(bytes, "woff2", "FONT_EXPANDED_SIZE");
});

test("font administration enforces auth/CSRF, validates content and exposes only registered public assets", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "bsign-fonts-"));
  const directory = path.join(root, "data"),
    origin = "http://localhost:3000";
  const { app, db } = createApp({ directory, origin, limits: false });
  try {
    const owner = request.agent(app),
      anonymous = request.agent(app);
    const password = randomBytes(24).toString("hex");
    db.prepare("INSERT INTO users(email,password) VALUES(?,?)").run(
      "font-owner@example.test",
      await hashPassword(password),
    );
    const anonymousCsrf = (await anonymous.get("/api/session")).body.csrf;
    assert.equal((await anonymous.get("/api/admin/fonts")).status, 401);
    assert.equal(
      (
        await anonymous
          .post("/api/admin/fonts")
          .set("Origin", origin)
          .set("X-CSRF-Token", anonymousCsrf)
          .attach("file", fontBytes(), "font.woff2")
      ).status,
      401,
    );
    let csrf = (await owner.get("/api/session")).body.csrf;
    csrf = (
      await owner
        .post("/api/login")
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf)
        .send({ email: "font-owner@example.test", password })
    ).body.csrf;
    const upload = (bytes, filename, fields = {}) => {
      let operation = owner
        .post("/api/admin/fonts")
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf);
      for (const [key, value] of Object.entries(fields))
        operation = operation.field(key, value);
      return operation.attach("file", bytes, filename);
    };
    assert.equal(
      (
        await owner
          .post("/api/admin/fonts")
          .attach("file", fontBytes(), "font.woff2")
      ).status,
      403,
    );
    assert.equal(
      (await upload(Buffer.from("fake font"), "fake.woff2")).body.error,
      "FONT_INVALID",
    );
    assert.equal(
      (await upload(fontBytes(), "fake.svg")).body.error,
      "FONT_FORMAT",
    );
    assert.equal(
      (
        await upload(fontBytes(), "font.woff2", {
          source: "javascript:alert(1)",
        })
      ).body.error,
      "FONT_SOURCE",
    );
    assert.equal(
      (
        await upload(fontBytes(), "font.woff2", {
          source: "https://user:password@example.test/font",
        })
      ).body.error,
      "FONT_SOURCE",
    );
    assert.equal(
      (await upload(Buffer.alloc(MAX_FONT_BYTES + 1), "too-big.woff2")).body
        .error,
      "LIMIT_FILE_SIZE",
    );
    assert.equal(
      db.prepare("SELECT count(*) count FROM custom_fonts").get().count,
      0,
    );
    assert.equal(readdirSync(path.join(directory, "fonts")).length, 0);
    const result = await upload(fontBytes(), "brand.woff2", {
      label: "Brand font",
      source: "https://example.test/font",
      license: "Private license notes",
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.metadata.familyName, "Noto Sans Thai");
    assert.match(result.body.family, /^BSIGN Custom [0-9a-f-]{36}$/);
    const publicList = await anonymous.get("/api/fonts");
    assert.equal(publicList.status, 200);
    assert.equal(publicList.body.length, 1);
    for (const field of [
      "metadata",
      "originalName",
      "source",
      "license",
      "createdAt",
      "usedIn",
      "inUse",
    ])
      assert.equal(publicList.body[0][field], undefined);
    const asset = await anonymous.get(result.body.url);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers["content-type"], "font/woff2");
    assert.equal(asset.headers["x-content-type-options"], "nosniff");
    assert.deepEqual(asset.body, fontBytes());
    const unregistered = "11111111-1111-1111-1111-111111111111.woff2";
    writeFileSync(path.join(directory, "fonts", unregistered), fontBytes());
    assert.equal((await anonymous.get(`/fonts/${unregistered}`)).status, 404);
    assert.equal(
      (await anonymous.get(`/fonts/${result.body.id}.ttf`)).status,
      404,
    );
    assert.equal(
      (await anonymous.get("/fonts/%2e%2e%2fsite.sqlite")).status,
      404,
    );
    assert.equal(
      (
        await anonymous
          .delete(`/api/admin/fonts/${result.body.id}`)
          .set("Origin", origin)
          .set("X-CSRF-Token", anonymousCsrf)
      ).status,
      401,
    );
    assert.equal(
      (
        await owner
          .delete(`/api/admin/fonts/${result.body.id}`)
          .set("Origin", origin)
          .set("X-CSRF-Token", csrf)
      ).status,
      200,
    );
    assert.equal((await anonymous.get(result.body.url)).status, 404);
    assert.equal((await anonymous.get("/api/fonts")).body.length, 0);
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});
