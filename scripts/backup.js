import { pathToFileURL } from "node:url";
import { DatabaseSync, backup } from "node:sqlite";
import {
  mkdirSync,
  cpSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  checkedBackupFile,
  fontFilesInDatabase,
  uploadFiles,
  validateBackupFonts,
  MAX_BACKUP_FILES,
  MAX_BACKUP_BYTES,
} from "./backup-assets.js";
export async function createBackup(source, target) {
  source = path.resolve(source);
  target = path.resolve(target);
  if (target === source || target.startsWith(source + path.sep))
    throw Error("Backup must be outside DATA_DIR");
  mkdirSync(target, { recursive: false, mode: 0o700 });
  let db;
  try {
    checkedBackupFile(source, "site.sqlite");
    db = new DatabaseSync(path.join(source, "site.sqlite"), { readOnly: true });
    await backup(db, path.join(target, "site.sqlite"));
    db.close();
    db = null;
    db = new DatabaseSync(path.join(target, "site.sqlite"), { readOnly: true });
    const assets = [...uploadFiles(source), ...fontFilesInDatabase(db)];
    if (assets.length + 1 > MAX_BACKUP_FILES)
      throw Error("Too many backup files");
    validateBackupFonts(db, source, assets);
    for (const file of assets) {
      const sourceFile = checkedBackupFile(source, file);
      mkdirSync(path.dirname(path.join(target, file)), {
        recursive: true,
        mode: 0o700,
      });
      cpSync(sourceFile, path.join(target, file), {
        errorOnExist: true,
        force: false,
      });
    }
    mkdirSync(path.join(target, "uploads"), { recursive: true, mode: 0o700 });
    mkdirSync(path.join(target, "fonts"), { recursive: true, mode: 0o700 });
    const checksums = {};
    let bytes = 0;
    for (const file of ["site.sqlite", ...assets]) {
      const buffer = readFileSync(checkedBackupFile(target, file));
      bytes += buffer.length;
      if (bytes > MAX_BACKUP_BYTES) throw Error("Backup exceeds size limit");
      checksums[file] = createHash("sha256").update(buffer).digest("hex");
    }
    writeFileSync(
      path.join(target, "manifest.json"),
      JSON.stringify(
        { version: 1, createdAt: new Date().toISOString(), checksums },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    return target;
  } catch (error) {
    // Windows keeps an open SQLite file locked. Release the snapshot before
    // deleting this invocation's target, and retain the original failure if
    // closing the handle or cleaning up also fails.
    try {
      db?.close();
    } catch (cleanupError) {
      if (error instanceof Error && error.cause === undefined)
        error.cause = cleanupError;
    }
    db = null;
    try {
      rmSync(target, { recursive: true, force: true });
    } catch (cleanupError) {
      if (error instanceof Error && error.cause === undefined)
        error.cause = cleanupError;
    }
    throw error;
  } finally {
    db?.close();
  }
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  if (process.env.BSIGN_MAINTENANCE !== "1")
    throw Error(
      "Stop the application and set BSIGN_MAINTENANCE=1 before backup (consistent DB + files)",
    );
  const target =
    process.argv[2] ||
    path.resolve("backups", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(path.dirname(target), { recursive: true });
  console.log(await createBackup(process.env.DATA_DIR || ".data", target));
}
