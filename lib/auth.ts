import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "fc_store_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signature(payload: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET harus berisi minimal 32 karakter.");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected && password && safeEqual(password, expected));
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
    if (Number(payload) <= Math.floor(Date.now() / 1000)) return false;

    return safeEqual(signature(payload), received);
  } catch {
    return false;
  }
}

export function adminCookieName() {
  return COOKIE_NAME;
}
