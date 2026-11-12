import { pathToFileURL } from "node:url";
import { DatabaseSync, backup } from "node:sqlite";
import {
  mkdirSync,
  cpSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
export async function createBackup(source, target) {
  source = path.resolve(source);
  target = path.resolve(target);
  if (target === source || target.startsWith(source + path.sep))
    throw Error("Backup must be outside DATA_DIR");
  mkdirSync(target, { recursive: false, mode: 0o700 });
  const db = new DatabaseSync(path.join(source, "site.sqlite"), {
    readOnly: true,
  });
  await backup(db, path.join(target, "site.sqlite"));
  db.close();
  cpSync(path.join(source, "uploads"), path.join(target, "uploads"), {
    recursive: true,
  });
  const checksums = {};
  function walk(dir) {
    for (const f of readdirSync(dir)) {
      const p = path.join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else
        checksums[path.relative(target, p).split(path.sep).join("/")] =
          createHash("sha256").update(readFileSync(p)).digest("hex");
    }
  }
  walk(target);
  writeFileSync(
    path.join(target, "manifest.json"),
    JSON.stringify(
      { version: 1, createdAt: new Date().toISOString(), checksums },
      null,
      2,
    ),
  );
  return target;
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
