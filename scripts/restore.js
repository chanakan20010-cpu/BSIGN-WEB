import { pathToFileURL } from "node:url";
import {
  readFileSync,
  existsSync,
  cpSync,
  rmSync,
  lstatSync,
  mkdirSync,
} from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
  checkedBackupFile,
  validateBackupFonts,
  MAX_BACKUP_FILES,
  MAX_BACKUP_BYTES,
  MAX_MANIFEST_BYTES,
} from "./backup-assets.js";
export function restoreBackup(source, target) {
  source = path.resolve(source);
  target = path.resolve(target);
  if (existsSync(target))
    throw Error("Restore target must not exist; preserve current data first");
  const manifestFile = path.join(source, "manifest.json");
  const manifestStat = lstatSync(manifestFile);
  if (
    !manifestStat.isFile() ||
    manifestStat.isSymbolicLink() ||
    manifestStat.size > MAX_MANIFEST_BYTES
  )
    throw Error("Invalid backup manifest");
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  if (
    manifest.version !== 1 ||
    !manifest.checksums ||
    typeof manifest.checksums !== "object" ||
    Array.isArray(manifest.checksums) ||
    !manifest.checksums["site.sqlite"]
  )
    throw Error("Invalid backup manifest");
  if (Object.keys(manifest.checksums).length > MAX_BACKUP_FILES)
    throw Error("Too many backup files");
  let bytes = 0;
  for (const [file, sum] of Object.entries(manifest.checksums)) {
    const buffer = readFileSync(checkedBackupFile(source, file));
    bytes += buffer.length;
    if (bytes > MAX_BACKUP_BYTES) throw Error("Backup exceeds size limit");
    if (typeof sum !== "string" || !/^[a-f0-9]{64}$/.test(sum))
      throw Error("Invalid backup checksum");
    if (createHash("sha256").update(buffer).digest("hex") !== sum)
      throw Error("Checksum mismatch");
  }
  const db = new DatabaseSync(path.join(source, "site.sqlite"), {
    readOnly: true,
  });
  try {
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
      throw Error("Database integrity failed");
    validateBackupFonts(db, source, Object.keys(manifest.checksums));
  } finally {
    db.close();
  }
  // Copy only manifest-verified files, never arbitrary extra files or secrets.
  let createdTarget = false;
  try {
    mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    // Create the target exclusively so a concurrent restore or a broken
    // symlink cannot turn cleanup into deletion of pre-existing data.
    mkdirSync(target, { mode: 0o700 });
    createdTarget = true;
    mkdirSync(path.join(target, "uploads"), { mode: 0o700 });
    mkdirSync(path.join(target, "fonts"), { mode: 0o700 });
    for (const file of Object.keys(manifest.checksums))
      cpSync(path.join(source, file), path.join(target, file), {
        errorOnExist: true,
        force: false,
      });
    const restored = new DatabaseSync(path.join(target, "site.sqlite"));
    try {
      restored.exec("DELETE FROM sessions");
    } finally {
      restored.close();
    }
    return target;
  } catch (error) {
    if (createdTarget) rmSync(target, { recursive: true, force: true });
    throw error;
  }
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  if (!process.argv[2] || !process.argv[3])
    throw Error("Usage: npm run restore -- BACKUP NEW_DATA_DIR");
  console.log(restoreBackup(process.argv[2], process.argv[3]));
}
