// Only the local desktop preview opts into writing initial credentials.
// Normal server/Docker startup never calls this helper.
import { randomBytes } from "node:crypto";
import {
  existsSync,
  openSync,
  writeFileSync,
  fsyncSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { hashPassword } from "./security.js";

export async function ensureInitialAdmin(db, directory) {
  const file = path.resolve(directory, "initial-admin.txt");
  const existing = () => ({
    file,
    status: existsSync(file) ? "existing" : "existing-no-file",
  });
  if (db.prepare("SELECT 1 FROM users LIMIT 1").get()) return existing();

  const email = "admin@bsign.local";
  const password = randomBytes(24).toString("base64url");
  const hash = await hashPassword(password);
  let createdFile = false;
  db.exec("BEGIN IMMEDIATE");
  try {
    // Another startup may have finished while the hash was being derived.
    if (db.prepare("SELECT 1 FROM users LIMIT 1").get()) {
      db.exec("COMMIT");
      return existing();
    }
    let fd;
    try {
      fd = openSync(file, "wx", 0o600);
      createdFile = true;
    } catch (error) {
      if (error.code === "EEXIST")
        throw Object.assign(
          new Error(
            "INITIAL_ADMIN_FILE_EXISTS: No account was created. Keep the existing initial-admin.txt safe and rename or move it before starting again.",
          ),
          { code: "INITIAL_ADMIN_FILE_EXISTS" },
        );
      throw error;
    }
    try {
      writeFileSync(
        fd,
        [
          "BSIGN TECH - Local preview initial administrator",
          "",
          `Username: ${email}`,
          `Password: ${password}`,
          "",
          "Open the website URL shown in START-WINDOWS, then add /admin.",
          "Username is the email address above. Keep this file private.",
          "This is the initial password only; a later password change does not update this file.",
          "",
          "เปิด URL เว็บไซต์ที่แสดงในหน้าต่าง START-WINDOWS แล้วเติม /admin",
          "ใช้ Username และ Password ด้านบนเข้าสู่ระบบ ชื่อผู้ใช้คืออีเมล",
          "เก็บไฟล์นี้ไว้เฉพาะผู้ดูแล รหัสผ่านสร้างแบบสุ่มเฉพาะเครื่องตอนเริ่มครั้งแรก",
          "หากเปลี่ยนรหัสผ่านในหลังบ้านแล้ว ให้ใช้รหัสผ่านใหม่ ไฟล์นี้ไม่ถูกเขียนทับ",
          "",
        ].join("\r\n"),
        "utf8",
      );
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    db.prepare("INSERT INTO users(email,password) VALUES(?,?)").run(
      email,
      hash,
    );
    db.exec("COMMIT");
    return { file, status: "created" };
  } catch (error) {
    db.exec("ROLLBACK");
    if (createdFile) unlinkSync(file);
    throw error;
  }
}
