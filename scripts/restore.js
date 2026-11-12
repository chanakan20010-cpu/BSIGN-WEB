import { pathToFileURL } from "node:url";
import { readFileSync, existsSync, cpSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
export function restoreBackup(source, target) {
  source = path.resolve(source);
  target = path.resolve(target);
  if (existsSync(target))
    throw Error("Restore target must not exist; preserve current data first");
  const manifest = JSON.parse(
    readFileSync(path.join(source, "manifest.json"), "utf8"),
  );
  if (manifest.version !== 1 || !manifest.checksums["site.sqlite"])
    throw Error("Invalid backup manifest");
  for (const [file, sum] of Object.entries(manifest.checksums)) {
    const p = path.resolve(source, file);
    if (!p.startsWith(source + path.sep) || !statSync(p).isFile())
      throw Error("Invalid backup path");
    if (createHash("sha256").update(readFileSync(p)).digest("hex") !== sum)
      throw Error("Checksum mismatch");
  }
  const db = new DatabaseSync(path.join(source, "site.sqlite"), {
    readOnly: true,
  });
  if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
    throw Error("Database integrity failed");
  db.close();
  // Copy only manifest-verified files, never arbitrary extra files or secrets.
  for (const file of Object.keys(manifest.checksums))
    cpSync(path.join(source, file), path.join(target, file));
  const restored = new DatabaseSync(path.join(target, "site.sqlite"));
  restored.exec("DELETE FROM sessions");
  restored.close();
  return target;
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  if (!process.argv[2] || !process.argv[3])
    throw Error("Usage: npm run restore -- BACKUP NEW_DATA_DIR");
  console.log(restoreBackup(process.argv[2], process.argv[3]));
}
