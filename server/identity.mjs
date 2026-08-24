/**
 * Password hashing plus shared identity rules.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { MAX_PASSWORD } from "../src/identity-rules.mjs";
export {
  MAX_EMAIL,
  MAX_PASSWORD,
  MAX_USERNAME,
  MIN_PASSWORD,
  MIN_USERNAME,
  emailIssue,
  normalizeEmail,
  normalizeUsername,
  passwordIssue,
  passwordStrength,
  usernameIssue,
} from "../src/identity-rules.mjs";

const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 32, maxmem: 64 * 1024 * 1024 };

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: SCRYPT.maxmem,
  }).toString("hex");
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt}$${hash}`;
}

function scryptHex(password, salt, N, r, p) {
  return scryptSync(password, salt, SCRYPT.keylen, {
    N,
    r,
    p,
    maxmem: SCRYPT.maxmem,
  });
}

export function checkPassword(password, stored) {
  if (typeof password !== "string" || password.length > MAX_PASSWORD) return false;
  const s = String(stored || "");
  try {
    if (s.startsWith("scrypt$")) {
      const parts = s.split("$");
      if (parts.length !== 6) return false;
      const N = Number(parts[1]);
      const r = Number(parts[2]);
      const p = Number(parts[3]);
      const salt = parts[4];
      const hash = parts[5];
      if (!N || !r || !p || !salt || !hash) return false;
      const next = scryptHex(password, salt, N, r, p);
      const prev = Buffer.from(hash, "hex");
      return prev.length === next.length && timingSafeEqual(prev, next);
    }
    const [salt, hash] = s.split(":");
    if (!salt || !hash) return false;
    const next = scryptSync(password, salt, SCRYPT.keylen);
    const prev = Buffer.from(hash, "hex");
    return prev.length === next.length && timingSafeEqual(prev, next);
  } catch {
    return false;
  }
}

export function passwordNeedsRehash(stored) {
  const expected = `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$`;
  return !String(stored || "").startsWith(expected);
}
