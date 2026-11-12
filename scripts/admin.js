import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import path from "node:path";
import { openDb } from "../server/db.js";
import { hashPassword } from "../server/security.js";
const rl = createInterface({ input: stdin, output: stdout });
const email = (await rl.question("Admin email: ")).trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error("Invalid email");
rl.close();
if (!stdin.isTTY) throw Error("Use an interactive terminal for password entry");
async function hidden(prompt) {
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  let value = "";
  return await new Promise((resolve, reject) => {
    const onData = (b) => {
      for (const c of b.toString()) {
        if (c === "\r" || c === "\n") {
          stdin.off("data", onData);
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (c === "\u0003") {
          stdin.setRawMode(false);
          process.exit(1);
        }
        if (c === "\u007f") {
          value = value.slice(0, -1);
        } else value += c;
      }
    };
    stdin.on("data", onData);
  });
}
const password = await hidden("Password (at least 12 characters, hidden): ");
const confirm = await hidden("Confirm password: ");
if (password.length < 12 || password.length > 200 || password !== confirm)
  throw Error("Password length or confirmation invalid");
const db = openDb(path.resolve(process.env.DATA_DIR || ".data"));
if (db.prepare("SELECT 1 FROM users WHERE email=?").get(email))
  throw Error("Account exists; use password change in admin");
db.prepare("INSERT INTO users(email,password) VALUES(?,?)").run(
  email,
  await hashPassword(password),
);
db.close();
console.log("Admin created.");
