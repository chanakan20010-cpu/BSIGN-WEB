import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import session from "express-session";
export function openDb(directory) {
  mkdirSync(directory, { recursive: true });
  mkdirSync(path.join(directory, "uploads"), { recursive: true });
  const db = new DatabaseSync(path.join(directory, "site.sqlite"));
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  db.exec(`CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS documents(key TEXT PRIMARY KEY, value TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(sid TEXT PRIMARY KEY, value TEXT NOT NULL, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS articles(id TEXT PRIMARY KEY, value TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, source TEXT NOT NULL, license TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS contacts(id TEXT PRIMARY KEY, value TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL, mail_status TEXT NOT NULL DEFAULT 'not_configured');
 CREATE TABLE IF NOT EXISTS subscribers(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, actor INTEGER, action TEXT NOT NULL, created_at TEXT NOT NULL);
 INSERT OR IGNORE INTO migrations VALUES(1,datetime('now'));`);
  return db;
}
export class SqliteStore extends session.Store {
  constructor(db) {
    super();
    this.db = db;
  }
  get(sid, cb) {
    try {
      const r = this.db
        .prepare("SELECT value FROM sessions WHERE sid=? AND expires>?")
        .get(sid, Date.now());
      cb(null, r ? JSON.parse(r.value) : null);
    } catch (e) {
      cb(e);
    }
  }
  set(sid, value, cb = () => {}) {
    try {
      this.db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
      this.db
        .prepare("INSERT OR REPLACE INTO sessions VALUES(?,?,?)")
        .run(sid, JSON.stringify(value), Date.now() + 8 * 3600000);
      cb();
    } catch (e) {
      cb(e);
    }
  }
  destroy(sid, cb = () => {}) {
    try {
      this.db.prepare("DELETE FROM sessions WHERE sid=?").run(sid);
      cb();
    } catch (e) {
      cb(e);
    }
  }
}
export function readDoc(db, key) {
  const r = db.prepare("SELECT * FROM documents WHERE key=?").get(key);
  return r ? { value: JSON.parse(r.value), revision: r.revision } : null;
}
export function merge(base, patch) {
  if (Array.isArray(patch))
    return patch.map((value, i) =>
      merge(Array.isArray(base) ? base[i] : undefined, value),
    );
  if (patch === null || typeof patch !== "object") return patch;
  const result = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (["__proto__", "constructor", "prototype"].includes(k))
      throw new Error("Unsafe key");
    result[k] = merge(base?.[k], v);
  }
  return result;
}
