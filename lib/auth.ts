import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

const COOKIE_NAME = "fc_store_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;
const PASSWORD_HASH_BYTES = 64;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, PASSWORD_HASH_BYTES, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

async function verifyPasswordHash(password: string, encoded: string) {
  const [scheme, saltText, keyText, extra] = encoded.split("$");
  if (scheme !== "scrypt" || !saltText || !keyText || extra) return false;
  try {
    const expected = Buffer.from(keyText, "base64url");
    if (expected.length !== PASSWORD_HASH_BYTES) return false;
    const actual = await deriveKey(password, Buffer.from(saltText, "base64url"));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

async function getStoredPasswordHash() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum dikonfigurasi.");
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS admin_credentials (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  let rows = await sql`SELECT password_hash FROM admin_credentials WHERE id = 1 LIMIT 1`;
  if (!rows.length) {
    const initialPassword = process.env.ADMIN_PASSWORD;
    if (!initialPassword) throw new Error("ADMIN_PASSWORD harus diatur untuk inisialisasi admin pertama.");
    const passwordHash = await hashPassword(initialPassword);
    await sql`
      INSERT INTO admin_credentials (id, password_hash)
      VALUES (1, ${passwordHash})
      ON CONFLICT (id) DO NOTHING
    `;
    rows = await sql`SELECT password_hash FROM admin_credentials WHERE id = 1 LIMIT 1`;
  }
  if (!rows.length || typeof rows[0].password_hash !== "string") {
    throw new Error("Kredensial admin tidak dapat dibaca.");
  }
  return String(rows[0].password_hash);
}

function signature(payload: string) {
  // Use a dedicated secret when configured; the database URL is a stable high-entropy fallback.
  const secret = process.env.SESSION_SECRET || process.env.DATABASE_URL;
  if (!secret || secret.length < 32) throw new Error("Konfigurasi sesi admin belum valid.");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function verifyAdminPassword(password: string) {
  if (!password) return false;
  const storedHash = await getStoredPasswordHash();
  return verifyPasswordHash(password, storedHash);
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  if (!(await verifyAdminPassword(currentPassword))) return false;
  if (newPassword.length < 8 || newPassword.length > 128) {
    throw new Error("Password baru harus berisi 8–128 karakter.");
  }
  const passwordHash = await hashPassword(newPassword);
  const sql = getDb();
  await sql`
    UPDATE admin_credentials
    SET password_hash = ${passwordHash}, updated_at = NOW()
    WHERE id = 1
  `;
  return true;
}

export async function resetAdminPassword() {
  const initialPassword = process.env.ADMIN_PASSWORD;
  if (!initialPassword) throw new Error("ADMIN_PASSWORD harus diatur untuk reset password.");
  const passwordHash = await hashPassword(initialPassword);
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS admin_credentials (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO admin_credentials (id, password_hash, updated_at)
    VALUES (1, ${passwordHash}, NOW())
    ON CONFLICT (id)
    DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW()
  `;
}

export function createAdminSession() {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = String(expires);
  return { value: `${payload}.${signature(payload)}`, maxAge: MAX_AGE_SECONDS };
}

export async function isAdminAuthenticated() {
  try {
    const jar = await cookies();
    const value = jar.get(COOKIE_NAME)?.value;
    if (!value) return false;

    const [payload, received, extra] = value.split(".");
    if (!payload || !received || extra) return false;
    if (!/^\d+$/.test(payload) || Number(payload) <= Math.floor(Date.now() / 1000)) return false;

    return safeEqual(signature(payload), received);
  } catch {
    return false;
  }
}

export function adminCookieName() {
  return COOKIE_NAME;
}
