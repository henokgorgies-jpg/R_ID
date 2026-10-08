import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PREFIX = "scrypt";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `${PREFIX}$${salt}$${key}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith(`${PREFIX}$`)) return false;

  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [, salt, keyHex] = parts;

  const derived = scryptSync(password, salt, 64);
  const key = Buffer.from(keyHex, "hex");
  if (derived.length !== key.length) return false;
  return timingSafeEqual(derived, key);
}
