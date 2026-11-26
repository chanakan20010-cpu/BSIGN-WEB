import {
  existsSync,
  lstatSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const mediaName =
  /^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}\.(?:svg|png|webp|jpe?g|gif|avif|ico)$/i;
const documentNames = {
  global: "ส่วนหัว ส่วนท้าย และข้อมูลเว็บไซต์",
  home: "หน้าแรก",
  about: "เกี่ยวกับเรา",
  news: "ตั้งค่าหน้าข่าวสาร",
  contact: "ติดต่อเรา",
  cta: "แบนเนอร์ติดต่อ",
  icons: "ไอคอนเว็บไซต์",
  maintenance: "หน้าปิดปรับปรุง",
  adminPresentation: "หน้าเข้าสู่ระบบ",
};
const failure = (status, code) =>
  Object.assign(new Error(code), { status, code });

// Scan saved content once, including draft articles and fields a newer client
// may have introduced. Return locations only, never unrelated document values.
export function mediaReferences(db, media) {
  const byName = new Map();
  const references = new Map(media.map(({ id }) => [id, []]));
  for (const { id } of media) {
    const key = id.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(id);
  }
  function scan(value, location, found) {
    if (typeof value === "string") {
      let decoded = value;
      try {
        decoded = decodeURIComponent(value);
      } catch {
        /* Keep ordinary text. */
      }
      for (const match of decoded.matchAll(
        /\/uploads\/([^/?#\s"'<>`()\[\]{},;]+)/gi,
      )) {
        for (const id of byName.get(match[1].toLowerCase()) || []) {
          if (!found.has(id)) found.set(id, new Set());
          found.get(id).add(location || "value");
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((entry, index) =>
        scan(entry, `${location}.${index}`, found),
      );
    } else if (value && typeof value === "object") {
      for (const [key, entry] of Object.entries(value))
        scan(entry, location ? `${location}.${key}` : key, found);
    }
  }
  function add(value, source) {
    const found = new Map();
    scan(value, "", found);
    for (const [id, paths] of found)
      references.get(id).push({ ...source, paths: [...paths].sort() });
  }
  for (const document of db.prepare("SELECT key,value FROM documents").all()) {
    let value;
    try {
      value = JSON.parse(document.value);
    } catch {
      throw failure(500, "MEDIA_REFERENCES_UNAVAILABLE");
    }
    add(value, {
      kind: "document",
      key: document.key,
      label: documentNames[document.key] || "ข้อมูลเว็บไซต์ที่บันทึกไว้",
    });
  }
  for (const article of db.prepare("SELECT id,value FROM articles").all()) {
    let value;
    try {
      value = JSON.parse(article.value);
    } catch {
      throw failure(500, "MEDIA_REFERENCES_UNAVAILABLE");
    }
    add(value, {
      kind: "article",
      id: article.id,
      label: String(
        value.title?.th || value.title?.en || value.slug || "บทความ",
      ).slice(0, 160),
      status:
        value.status === "draft"
          ? "draft"
          : new Date(value.publishedAt) > new Date()
            ? "scheduled"
            : "published",
    });
  }
  return references;
}

export function listMedia(db) {
  const media = db
    .prepare("SELECT * FROM media ORDER BY created_at DESC,id")
    .all();
  const references = mediaReferences(db, media);
  return media.map((entry) => {
    const locations = references.get(entry.id);
    const usageCount = locations.reduce(
      (total, location) => total + location.paths.length,
      0,
    );
    return {
      ...entry,
      url: "/uploads/" + entry.id,
      inUse: usageCount > 0,
      usageCount,
      references: locations,
    };
  });
}

export function deleteMedia(db, directory, id, operations = {}) {
  if (typeof id !== "string" || !mediaName.test(id))
    throw failure(400, "INVALID_MEDIA_ID");
  const remove = operations.unlinkSync || unlinkSync;
  const restore = operations.writeFileSync || writeFileSync;
  let removed = false;
  let backup;
  let file;
  let mode;
  let alreadyMissing = false;
  let transaction = false;
  try {
    db.exec("BEGIN IMMEDIATE");
    transaction = true;
    const entry = db.prepare("SELECT * FROM media WHERE id=?").get(id);
    if (!entry) throw failure(404, "MEDIA_NOT_FOUND");
    const references = mediaReferences(db, [entry]).get(id);
    if (references.length) {
      const error = failure(409, "MEDIA_IN_USE");
      error.references = references;
      throw error;
    }
    const uploads = path.join(directory, "uploads");
    const folder = lstatSync(uploads);
    if (!folder.isDirectory() || folder.isSymbolicLink())
      throw failure(500, "MEDIA_STORAGE_UNAVAILABLE");
    file = path.join(uploads, id);
    let stat;
    try {
      stat = lstatSync(file);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      alreadyMissing = true;
    }
    if (stat) {
      if (!stat.isFile() || stat.isSymbolicLink())
        throw failure(500, "MEDIA_FILE_UNSAFE");
      // Uploads are capped at 8 MB. Permit older imported image assets up to
      // the backup limit, and retain bytes until SQLite commits so a database
      // failure can restore the original image rather than leave a broken row.
      if (stat.size > 64 * 1024 * 1024)
        throw failure(500, "MEDIA_FILE_TOO_LARGE");
      backup = readFileSync(file);
      mode = stat.mode & 0o777;
      remove(file);
      removed = true;
    }
    db.prepare("DELETE FROM media WHERE id=?").run(id);
    operations.onDelete?.();
    db.exec("COMMIT");
    return { ok: true, alreadyMissing };
  } catch (error) {
    if (transaction) {
      try {
        db.exec("ROLLBACK");
      } catch {
        /* Keep the original failure. */
      }
    }
    if (removed && backup && !existsSync(file)) {
      try {
        restore(file, backup, { flag: "wx", mode });
      } catch (restoreError) {
        error.cause = restoreError;
      }
    }
    if (error.status) throw error;
    throw Object.assign(failure(500, "MEDIA_DELETE_FAILED"), { cause: error });
  }
}
