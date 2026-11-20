import { lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  registeredFontFiles,
  validateFontFile,
  MAX_FONT_BYTES,
} from "../server/font-library.js";

export const MAX_BACKUP_FILES = 20000;
export const MAX_BACKUP_BYTES = 4 * 1024 ** 3;
export const MAX_MANIFEST_BYTES = 8 * 1024 ** 2;
// Older installations may contain descriptive image filenames. Keep those
// assets while still accepting only a flat image directory, never secrets.
const mediaPath =
  /^uploads\/[A-Za-z0-9][A-Za-z0-9_.-]{0,199}\.(svg|png|webp|jpe?g|gif|avif|ico)$/;
const fontPath = /^fonts\/[a-f0-9-]{36}\.(woff2|woff|ttf|otf)$/;

export function backupFileLimit(file) {
  if (file === "site.sqlite") return 1024 ** 3;
  if (fontPath.test(file)) return MAX_FONT_BYTES;
  if (mediaPath.test(file)) return 64 * 1024 ** 2;
  throw Error("Invalid backup path");
}

// Reject symlinks in every component, including the asset directories. A
// checksum proves bytes, but must not grant access outside the backup folder.
export function checkedBackupFile(root, file) {
  const limit = backupFileLimit(file);
  const parts = file.split("/");
  let current = root;
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stat = lstatSync(current);
    if (
      stat.isSymbolicLink() ||
      (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())
    )
      throw Error("Invalid backup path");
    if (index === parts.length - 1 && (stat.size < 1 || stat.size > limit))
      throw Error("Backup file exceeds size limit");
  }
  return current;
}

export function fontFilesInDatabase(db) {
  if (
    !db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='custom_fonts'",
      )
      .get()
  )
    return [];
  return registeredFontFiles(db).map((file) => `fonts/${file}`);
}

export function validateBackupFonts(db, root, files) {
  const registered = new Set(fontFilesInDatabase(db));
  const supplied = new Set(files.filter((file) => file.startsWith("fonts/")));
  if (
    registered.size !== supplied.size ||
    [...registered].some((file) => !supplied.has(file))
  )
    throw Error("Backup font files do not match font records");
  for (const file of registered) {
    const buffer = readFileSync(checkedBackupFile(root, file));
    validateFontFile(buffer, path.extname(file));
  }
}

export function uploadFiles(root) {
  const dir = path.join(root, "uploads");
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw Error("Invalid backup path");
  return readdirSync(dir).map((file) => {
    const relative = `uploads/${file}`;
    checkedBackupFile(root, relative);
    return relative;
  });
}
