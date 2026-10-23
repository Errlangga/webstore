import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

const COOKIE_NAME = "astra_market_user";
const DEVICE_COOKIE_NAME = "astra_market_device";
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 14;
const DEVICE_AGE_SECONDS = 60 * 60 * 24 * 365;
const HASH_BYTES = 64;

export type MarketUser = { id: number; username: string; created_at: string };

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, HASH_BYTES, (error, key) => {
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

async function verifyPassword(password: string, encoded: string) {
  const [scheme, saltText, keyText, extra] = encoded.split("$");
  if (scheme !== "scrypt" || !saltText || !keyText || extra) return false;
  try {
    const expected = Buffer.from(keyText, "base64url");
    if (expected.length !== HASH_BYTES) return false;
    const actual = await deriveKey(password, Buffer.from(saltText, "base64url"));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.DATABASE_URL;
  if (!secret || secret.length < 32) throw new Error("Konfigurasi sesi user belum valid.");
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}


export function createMarketDeviceToken() {
  return randomBytes(32).toString("base64url");
}

export async function getMarketDeviceToken(): Promise<string | null> {
  try {
    const jar = await cookies();
    const value = jar.get(DEVICE_COOKIE_NAME)?.value;
    return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function marketDeviceCookieName() {
  return DEVICE_COOKIE_NAME;
}

export function marketDeviceCookieMaxAge() {
  return DEVICE_AGE_SECONDS;
}

export function hashMarketDeviceToken(token: string) {
  return createHmac("sha256", sessionSecret()).update(`astra-market-device:${token}`).digest("hex");
}

export async function getMarketDeviceBinding(deviceHash: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT binding.user_id, account.username
    FROM user_device_bindings binding
    LEFT JOIN user_accounts account ON account.id = binding.user_id
    WHERE binding.device_hash = ${deviceHash}
    LIMIT 1
  `;
  if (!rows.length) return null;
  return {
    userId: rows[0].user_id === null ? null : Number(rows[0].user_id),
    username: typeof rows[0].username === "string" ? rows[0].username : null,
  };
}

export async function reserveMarketDevice(deviceHash: string) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO user_device_bindings (device_hash, user_id)
    VALUES (${deviceHash}, NULL)
    ON CONFLICT (device_hash) DO NOTHING
    RETURNING device_hash
  `;
  return rows.length > 0;
}

export async function bindMarketDevice(deviceHash: string, userId: number) {
  const sql = getDb();
  const updated = await sql`
    UPDATE user_device_bindings
    SET user_id = ${userId}, bound_at = COALESCE(bound_at, NOW()), last_seen_at = NOW()
    WHERE device_hash = ${deviceHash} AND (user_id IS NULL OR user_id = ${userId})
    RETURNING user_id
  `;
  if (updated.length) return true;
  const inserted = await sql`
    INSERT INTO user_device_bindings (device_hash, user_id, bound_at, last_seen_at)
    VALUES (${deviceHash}, ${userId}, NOW(), NOW())
    ON CONFLICT (device_hash) DO NOTHING
    RETURNING user_id
  `;
  if (inserted.length) return true;
  const binding = await getMarketDeviceBinding(deviceHash);
  return binding?.userId === userId;
}

export async function releaseUnboundMarketDevice(deviceHash: string) {
  const sql = getDb();
  await sql`DELETE FROM user_device_bindings WHERE device_hash = ${deviceHash} AND user_id IS NULL`;
}

export function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateCredentials(usernameValue: unknown, passwordValue: unknown) {
  const username = normalizeUsername(usernameValue);
  const password = typeof passwordValue === "string" ? passwordValue : "";
  if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username)) {
    return { error: "Username harus 3–24 karakter dan hanya boleh memakai huruf, angka, titik, garis bawah, atau tanda hubung." } as const;
  }
  if (password.length < 8 || password.length > 128) {
    return { error: "Password harus 8–128 karakter." } as const;
  }
  return { username, usernameNormalized: username.toLowerCase(), password } as const;
}

export async function registerMarketUser(username: string, usernameNormalized: string, password: string) {
  if (!process.env.DATABASE_URL) throw new Error("Database belum dikonfigurasi.");
  const passwordHash = await hashPassword(password);
  const sql = getDb();
  const rows = await sql`
    INSERT INTO user_accounts (username, username_normalized, password_hash)
    VALUES (${username}, ${usernameNormalized}, ${passwordHash})
    ON CONFLICT (username_normalized) DO NOTHING
    RETURNING id, username, created_at
  `;
  return (rows[0] as MarketUser | undefined) ?? null;
}

export async function verifyMarketUser(usernameValue: unknown, passwordValue: unknown) {
  const username = normalizeUsername(usernameValue);
  const password = typeof passwordValue === "string" ? passwordValue : "";
  if (!username || !password || !process.env.DATABASE_URL) return null;
  const sql = getDb();
  const rows = await sql`
    SELECT id, username, password_hash, created_at
    FROM user_accounts
    WHERE username_normalized = ${username.toLowerCase()}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || typeof row.password_hash !== "string") return null;
  if (!(await verifyPassword(password, row.password_hash))) return null;
  return { id: Number(row.id), username: String(row.username), created_at: String(row.created_at) } satisfies MarketUser;
}

export function createMarketUserSession(userId: number) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_AGE_SECONDS;
  const payload = `${userId}.${expires}`;
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_AGE_SECONDS };
}

export async function getMarketUser(): Promise<MarketUser | null> {
  try {
    const jar = await cookies();
    const value = jar.get(COOKIE_NAME)?.value;
    if (!value || !process.env.DATABASE_URL) return null;
    const [userIdText, expiresText, received, extra] = value.split(".");
    if (!userIdText || !expiresText || !received || extra) return null;
    if (!/^\d+$/.test(userIdText) || !/^\d+$/.test(expiresText)) return null;
    const userId = Number(userIdText);
    const expires = Number(expiresText);
    if (!Number.isSafeInteger(userId) || userId <= 0 || expires <= Math.floor(Date.now() / 1000)) return null;
    const payload = `${userId}.${expires}`;
    if (!safeEqual(sign(payload), received)) return null;
    const sql = getDb();
    const rows = await sql`SELECT id, username, created_at FROM user_accounts WHERE id = ${userId} LIMIT 1`;
    if (!rows.length) return null;
    return { id: Number(rows[0].id), username: String(rows[0].username), created_at: String(rows[0].created_at) };
  } catch {
    return null;
  }
}

export async function recordUserAuthAttempt(fingerprint: string, action: "login" | "register") {
  const sql = getDb();
  await sql`DELETE FROM user_auth_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours'`;
  await sql`INSERT INTO user_auth_attempts (fingerprint, action) VALUES (${fingerprint}, ${action})`;
}

export async function isUserAuthRateLimited(fingerprint: string, action: "login" | "register", maxAttempts = 10) {
  const sql = getDb();
  const rows = await sql`
    SELECT COUNT(*)::int AS attempts, MIN(attempted_at) AS oldest
    FROM user_auth_attempts
    WHERE fingerprint = ${fingerprint}
      AND action = ${action}
      AND attempted_at > NOW() - INTERVAL '15 minutes'
  `;
  const attempts = Number(rows[0]?.attempts || 0);
  if (attempts < maxAttempts) return { limited: false, retryAfter: 0 };
  const value = rows[0]?.oldest;
  const oldest = value instanceof Date ? value.getTime() : value ? new Date(String(value)).getTime() : Date.now();
  return { limited: true, retryAfter: Math.max(1, Math.ceil((oldest + 15 * 60_000 - Date.now()) / 1000)) };
}

export async function clearUserAuthAttempts(fingerprint: string, action: "login" | "register") {
  const sql = getDb();
  await sql`DELETE FROM user_auth_attempts WHERE fingerprint = ${fingerprint} AND action = ${action}`;
}

export function userAuthFingerprint(request: Request) {
  const ip = request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const key = process.env.SESSION_SECRET || process.env.DATABASE_URL || "market-auth-limit";
  return createHmac("sha256", key).update(ip).digest("hex");
}

export function marketUserCookieName() {
  return COOKIE_NAME;
}
