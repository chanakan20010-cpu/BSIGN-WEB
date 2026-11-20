import multer from "multer";
import rateLimit from "express-rate-limit";
import * as fontkit from "fontkit";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { brotliDecompressSync, inflateSync } from "node:zlib";
import { z } from "zod";
import { isBuiltInFont, isSafeCustomFontFamily } from "../src/font-catalog.js";

export { isBuiltInFont, isSafeCustomFontFamily };
export const MAX_FONT_BYTES = 5 * 1024 * 1024;
export const MAX_SFNT_BYTES = 32 * 1024 * 1024;
const idPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const formats = new Set(["woff2", "woff", "ttf", "otf"]);
const mime = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
};
const fail = (status, code) => Object.assign(new Error(code), { status, code });
const cleanText = (value, limit = 200) =>
  String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, limit);

export function initializeFontLibrary(db, directory) {
  db.exec(`CREATE TABLE IF NOT EXISTS custom_fonts(
    id TEXT PRIMARY KEY, family TEXT UNIQUE NOT NULL, label TEXT NOT NULL,
    original_name TEXT NOT NULL, format TEXT NOT NULL, weight INTEGER NOT NULL,
    style TEXT NOT NULL, metadata TEXT NOT NULL, source TEXT NOT NULL DEFAULT '',
    license TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
  )`);
  mkdirSync(path.join(directory, "fonts"), { recursive: true, mode: 0o700 });
}

// Check both declared and actual decompressed lengths before passing bytes to
// fontkit. Its parser otherwise decompresses eagerly without an output limit.
function compressedDirectory(buffer, format, tables) {
  const header = format === "woff" ? 44 : 48;
  if (
    buffer.length < header ||
    buffer.readUInt32BE(8) !== buffer.length ||
    buffer.readUInt16BE(14) !== 0 ||
    buffer.readUInt32BE(4) === 0x74746366
  )
    throw fail(400, "FONT_INVALID");
  if (![0x00010000, 0x4f54544f, 0x74727565].includes(buffer.readUInt32BE(4)))
    throw fail(400, "FONT_INVALID");
  const expanded = buffer.readUInt32BE(16);
  if (expanded < 12 || expanded > MAX_SFNT_BYTES)
    throw fail(400, "FONT_EXPANDED_SIZE");
  let originalSize = 12 + tables * 16;
  let transformedSize = 0;
  const tags = new Set();
  const addTable = (tag, original, transformed = original) => {
    if (tags.has(tag)) throw fail(400, "FONT_INVALID");
    tags.add(tag);
    originalSize += Math.ceil(original / 4) * 4;
    transformedSize += transformed;
    if (originalSize > MAX_SFNT_BYTES || transformedSize > MAX_SFNT_BYTES)
      throw fail(400, "FONT_EXPANDED_SIZE");
  };
  if (format === "woff") {
    const directoryEnd = header + tables * 20;
    if (directoryEnd > buffer.length) throw fail(400, "FONT_INVALID");
    for (let i = 0; i < tables; i++) {
      const start = header + i * 20;
      const offset = buffer.readUInt32BE(start + 4);
      const length = buffer.readUInt32BE(start + 8);
      const original = buffer.readUInt32BE(start + 12);
      addTable(buffer.toString("latin1", start, start + 4), original);
      if (
        length > original ||
        offset < directoryEnd ||
        offset + length > buffer.length
      )
        throw fail(400, "FONT_INVALID");
      if (length < original) {
        const decoded = inflateSync(buffer.subarray(offset, offset + length), {
          maxOutputLength: Math.min(original, MAX_SFNT_BYTES),
        });
        if (decoded.length !== original) throw fail(400, "FONT_INVALID");
      }
    }
  } else {
    let position = header;
    const byte = () => {
      if (position >= buffer.length) throw fail(400, "FONT_INVALID");
      return buffer[position++];
    };
    const base128 = () => {
      let value = 0;
      for (let i = 0; i < 5; i++) {
        const code = byte();
        if ((i === 0 && code === 0x80) || value > 0x1ffffff)
          throw fail(400, "FONT_INVALID");
        value = value * 128 + (code & 127);
        if (!(code & 128)) return value;
      }
      throw fail(400, "FONT_INVALID");
    };
    const knownTags =
      "cmap,head,hhea,hmtx,maxp,name,OS/2,post,cvt ,fpgm,glyf,loca,prep,CFF ,VORG,EBDT,EBLC,gasp,hdmx,kern,LTSH,PCLT,VDMX,vhea,vmtx,BASE,GDEF,GPOS,GSUB,EBSC,JSTF,MATH,CBDT,CBLC,COLR,CPAL,SVG ,sbix,acnt,avar,bdat,bloc,bsln,cvar,fdsc,feat,fmtx,fvar,gvar,hsty,just,lcar,mort,morx,opbd,prop,trak,Zapf,Silf,Glat,Gloc,Feat,Sill".split(
        ",",
      );
    for (let i = 0; i < tables; i++) {
      const flags = byte(),
        index = flags & 63,
        version = flags >>> 6;
      const tag =
        index === 63
          ? String.fromCharCode(byte(), byte(), byte(), byte())
          : knownTags[index];
      const isOutline = tag === "glyf" || tag === "loca";
      if (
        isOutline
          ? ![0, 3].includes(version)
          : tag === "hmtx"
            ? ![0, 1].includes(version)
            : version !== 0
      )
        throw fail(400, "FONT_INVALID");
      // glyf and loca use transform version 0; other tables use nonzero versions.
      const transformed =
        index === 10 || index === 11 || tag === "glyf" || tag === "loca"
          ? version === 0
          : version !== 0;
      const original = base128();
      addTable(tag, original, transformed ? base128() : original);
    }
    const compressedLength = buffer.readUInt32BE(20);
    if (!compressedLength || position + compressedLength > buffer.length)
      throw fail(400, "FONT_INVALID");
    const decoded = brotliDecompressSync(
      buffer.subarray(position, position + compressedLength),
      {
        maxOutputLength: MAX_SFNT_BYTES,
      },
    );
    if (decoded.length !== transformedSize) throw fail(400, "FONT_INVALID");
  }
  if (originalSize !== expanded) throw fail(400, "FONT_INVALID");
}

export function validateFontFile(buffer, extension) {
  const format = String(extension || "")
    .replace(/^\./, "")
    .toLowerCase();
  if (!formats.has(format)) throw fail(400, "FONT_FORMAT");
  if (!Buffer.isBuffer(buffer) || buffer.length < 12)
    throw fail(400, "FONT_INVALID");
  if (buffer.length > MAX_FONT_BYTES) throw fail(400, "FONT_TOO_LARGE");
  const signature = buffer.toString("ascii", 0, 4);
  if (signature === "ttcf") throw fail(400, "FONT_COLLECTION");
  const expected = { woff2: "wOF2", woff: "wOFF", otf: "OTTO" };
  if (format === "ttf") {
    if (!(buffer.readUInt32BE(0) === 0x00010000 || signature === "true"))
      throw fail(400, "FONT_INVALID");
  } else if (signature !== expected[format]) throw fail(400, "FONT_INVALID");
  try {
    const compressed = format === "woff" || format === "woff2";
    if (compressed && buffer.length < (format === "woff" ? 44 : 48))
      throw fail(400, "FONT_INVALID");
    const tables = buffer.readUInt16BE(compressed ? 12 : 4);
    if (!tables || tables > 256) throw fail(400, "FONT_INVALID");
    if (compressed) compressedDirectory(buffer, format, tables);
    else {
      const directoryEnd = 12 + tables * 16;
      if (directoryEnd > buffer.length) throw fail(400, "FONT_INVALID");
      const tags = new Set();
      for (let i = 0; i < tables; i++) {
        const start = 12 + i * 16;
        const tag = buffer.toString("latin1", start, start + 4);
        const offset = buffer.readUInt32BE(start + 8);
        const length = buffer.readUInt32BE(start + 12);
        if (
          tags.has(tag) ||
          offset < directoryEnd ||
          offset + length > buffer.length
        )
          throw fail(400, "FONT_INVALID");
        tags.add(tag);
      }
    }
    const font = fontkit.create(buffer);
    if (
      font.fonts ||
      !Number.isInteger(font.numGlyphs) ||
      font.numGlyphs < 1 ||
      font.numGlyphs > 100000
    )
      throw fail(400, "FONT_INVALID");
    if (!(font.unitsPerEm >= 16 && font.unitsPerEm <= 16384))
      throw fail(400, "FONT_INVALID");
    // Exercise cmap, metrics, and outline parsing without enumerating the
    // entire character set or shaping an unbounded string supplied by a font.
    for (const code of [0x41, 0x0e01]) {
      const glyph = font.glyphForCodePoint(code);
      if (
        !Number.isFinite(glyph.advanceWidth) ||
        glyph.path.commands.length > 100000
      )
        throw fail(400, "FONT_INVALID");
    }
    const axis = font.variationAxes?.wght;
    const range =
      axis && Number.isFinite(axis.min) && Number.isFinite(axis.max)
        ? [
            Math.max(100, Math.round(axis.min)),
            Math.min(1000, Math.round(axis.max)),
          ]
        : null;
    const weight = Math.max(
      100,
      Math.min(1000, Math.round(font["OS/2"]?.usWeightClass || 400)),
    );
    const subfamily = cleanText(font.subfamilyName);
    return {
      format,
      weight,
      style: /italic|oblique/i.test(subfamily) ? "italic" : "normal",
      metadata: {
        familyName: cleanText(font.familyName),
        subfamilyName: subfamily,
        postscriptName: cleanText(font.postscriptName),
        numGlyphs: font.numGlyphs,
        unitsPerEm: font.unitsPerEm,
        weightRange: range && range[0] <= range[1] ? range : null,
      },
    };
  } catch (error) {
    if (error.code === "FONT_EXPANDED_SIZE") throw error;
    if (error.code === "ERR_BUFFER_TOO_LARGE")
      throw fail(400, "FONT_EXPANDED_SIZE");
    throw fail(400, "FONT_INVALID");
  }
}

function safeRow(row) {
  if (
    !row ||
    !idPattern.test(row.id) ||
    row.family !== `BSIGN Custom ${row.id}` ||
    !formats.has(row.format)
  )
    throw fail(400, "FONT_INVALID_RECORD");
  return row;
}
export function registeredFontFiles(db) {
  return db
    .prepare("SELECT * FROM custom_fonts ORDER BY id")
    .all()
    .map((row) => {
      safeRow(row);
      return `${row.id}.${row.format}`;
    });
}
function usedIn(db, family) {
  const includes = (value) =>
    typeof value === "string"
      ? value === family
      : Array.isArray(value)
        ? value.some(includes)
        : value && typeof value === "object"
          ? Object.values(value).some(includes)
          : false;
  const result = [];
  for (const row of db.prepare("SELECT key,value FROM documents").all())
    if (includes(JSON.parse(row.value))) result.push(row.key);
  for (const row of db.prepare("SELECT id,value FROM articles").all())
    if (includes(JSON.parse(row.value))) result.push(`article:${row.id}`);
  return result;
}
function describe(row, publicOnly = false, db) {
  safeRow(row);
  const metadata = JSON.parse(row.metadata);
  const result = {
    id: row.id,
    family: row.family,
    label: row.label,
    format: row.format,
    url: `/fonts/${row.id}.${row.format}`,
    weight: row.weight,
    weights: metadata.weightRange || [row.weight],
    weightRange: metadata.weightRange,
    style: row.style,
    custom: true,
  };
  if (!publicOnly)
    Object.assign(result, {
      originalName: row.original_name,
      metadata,
      source: row.source,
      license: row.license,
      createdAt: row.created_at,
      usedIn: usedIn(db, row.family),
    });
  if (!publicOnly) result.inUse = result.usedIn.length > 0;
  return result;
}
export function listFontAssets(db, { publicOnly = false } = {}) {
  return db
    .prepare("SELECT * FROM custom_fonts ORDER BY created_at DESC,id")
    .all()
    .map((row) => describe(row, publicOnly, db));
}
export function validateFontSelection(db, family) {
  if (isBuiltInFont(family)) return true;
  if (
    !isSafeCustomFontFamily(family) ||
    !db.prepare("SELECT 1 FROM custom_fonts WHERE family=?").get(family)
  )
    throw fail(400, "FONT_UNAVAILABLE");
  return true;
}

export function installFontRoutes(app, { db, directory, auth, limits = true }) {
  initializeFontLibrary(db, directory);
  const storage = path.join(directory, "fonts");
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_FONT_BYTES,
      files: 1,
      fields: 3,
      parts: 4,
      fieldSize: 2048,
    },
  });
  const limiter = limits
    ? rateLimit({
        windowMs: 15 * 60000,
        limit: 20,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { error: "RATE_LIMIT" },
      })
    : (_q, _r, next) => next();
  app.get("/api/fonts", (_q, res) =>
    res.json(listFontAssets(db, { publicOnly: true })),
  );
  app.get("/api/admin/fonts", auth, (_q, res) => res.json(listFontAssets(db)));
  app.post(
    "/api/admin/fonts",
    auth,
    limiter,
    upload.single("file"),
    (req, res) => {
      if (!req.file) throw fail(400, "FONT_FILE_REQUIRED");
      const original = cleanText(
        req.file.originalname.replaceAll("\\", "/").split("/").at(-1),
      );
      const extension = path.extname(original).slice(1).toLowerCase();
      const parsed = validateFontFile(req.file.buffer, extension);
      const label =
        cleanText(
          z
            .string()
            .trim()
            .max(100)
            .parse(req.body.label || ""),
          100,
        ) ||
        parsed.metadata.familyName ||
        original;
      const source = z
        .string()
        .trim()
        .max(2000)
        .parse(req.body.source || "");
      if (source) {
        let url;
        try {
          url = new URL(source);
        } catch {
          throw fail(400, "FONT_SOURCE");
        }
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.username ||
          url.password
        )
          throw fail(400, "FONT_SOURCE");
      }
      const license = cleanText(
        z
          .string()
          .trim()
          .max(1000)
          .parse(req.body.license || ""),
        1000,
      );
      const id = randomUUID(),
        family = `BSIGN Custom ${id}`;
      const filename = path.join(storage, `${id}.${extension}`);
      writeFileSync(filename, req.file.buffer, { flag: "wx", mode: 0o600 });
      try {
        db.prepare(
          "INSERT INTO custom_fonts VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        ).run(
          id,
          family,
          label,
          original,
          parsed.format,
          parsed.weight,
          parsed.style,
          JSON.stringify(parsed.metadata),
          source,
          license,
          new Date().toISOString(),
        );
      } catch (error) {
        rmSync(filename, { force: true });
        throw error;
      }
      res
        .status(201)
        .json(
          describe(
            db.prepare("SELECT * FROM custom_fonts WHERE id=?").get(id),
            false,
            db,
          ),
        );
    },
  );
  app.delete("/api/admin/fonts/:id", auth, (req, res) => {
    if (!idPattern.test(req.params.id)) throw fail(404, "FONT_NOT_FOUND");
    const row = db
      .prepare("SELECT * FROM custom_fonts WHERE id=?")
      .get(req.params.id);
    if (!row) throw fail(404, "FONT_NOT_FOUND");
    safeRow(row);
    if (usedIn(db, row.family).length) throw fail(409, "FONT_IN_USE");
    db.prepare("DELETE FROM custom_fonts WHERE id=?").run(row.id);
    // A failed cleanup leaves an unreferenced asset, never a referenced missing
    // font. Registered font files drive backups and restoration.
    rmSync(path.join(storage, `${row.id}.${row.format}`), { force: true });
    res.json({ ok: true });
  });
  app.get("/fonts/:filename", (req, res) => {
    const match = /^([0-9a-f-]{36})\.(woff2|woff|ttf|otf)$/.exec(
      req.params.filename,
    );
    if (!match || !idPattern.test(match[1])) return res.status(404).end();
    const row = db
      .prepare("SELECT * FROM custom_fonts WHERE id=? AND format=?")
      .get(match[1], match[2]);
    if (
      !row ||
      !existsSync(path.join(storage, req.params.filename)) ||
      !lstatSync(path.join(storage, req.params.filename)).isFile()
    )
      return res.status(404).end();
    safeRow(row);
    res.set({
      "Content-Type": mime[row.format],
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public,max-age=31536000,immutable",
    });
    res.sendFile(path.resolve(storage, req.params.filename));
  });
}
