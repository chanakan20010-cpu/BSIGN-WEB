import { randomBytes, scrypt as rawScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(rawScrypt);
export async function hashPassword(password) {
  const salt = randomBytes(32).toString("hex");
  return (
    salt +
    ":" +
    (
      await scrypt(password, salt, 64, {
        N: 65536,
        r: 8,
        p: 1,
        maxmem: 128 * 1024 * 1024,
      })
    ).toString("hex")
  );
}
export async function verifyPassword(password, hash) {
  const [salt, key] = hash.split(":");
  const result = await scrypt(password, salt, 64, {
    N: 65536,
    r: 8,
    p: 1,
    maxmem: 128 * 1024 * 1024,
  });
  return timingSafeEqual(result, Buffer.from(key, "hex"));
}
export function csrfToken(req) {
  return (req.session.csrf ??= randomBytes(32).toString("hex"));
}
