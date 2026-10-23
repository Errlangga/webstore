import { NextResponse } from "next/server";
import {
  bindMarketDevice,
  clearUserAuthAttempts,
  createMarketDeviceToken,
  createMarketUserSession,
  getMarketDeviceBinding,
  getMarketDeviceToken,
  hashMarketDeviceToken,
  isUserAuthRateLimited,
  marketDeviceCookieMaxAge,
  marketDeviceCookieName,
  marketUserCookieName,
  recordUserAuthAttempt,
  userAuthFingerprint,
  verifyMarketUser,
} from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  const fingerprint = userAuthFingerprint(request);
  try {
    const limit = await isUserAuthRateLimited(fingerprint, "login", 10);
    if (limit.limited) {
      return NextResponse.json({ error: "Terlalu banyak percobaan login. Coba lagi 15 menit lagi." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } });
    }
    let body: unknown;
    try { body = await request.json(); } catch {
      await recordUserAuthAttempt(fingerprint, "login");
      return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
    }
    const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const username = typeof values.username === "string" ? values.username.trim() : "";
    const password = typeof values.password === "string" ? values.password : "";
    if (!username || !password || username.length > 24 || password.length > 128) {
      await recordUserAuthAttempt(fingerprint, "login");
      return NextResponse.json({ error: "Username atau password salah." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const user = await verifyMarketUser(username, password);
    if (!user) {
      await recordUserAuthAttempt(fingerprint, "login");
      return NextResponse.json({ error: "Username atau password salah." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const deviceToken = await getMarketDeviceToken() || createMarketDeviceToken();
    const deviceHash = hashMarketDeviceToken(deviceToken);
    if (!(await bindMarketDevice(deviceHash, user.id))) {
      const binding = await getMarketDeviceBinding(deviceHash);
      const owner = binding?.username ? ` @${binding.username}` : "akun lain";
      const response = NextResponse.json({
        error: `Browser/perangkat ini sudah terhubung dengan${owner}. Gunakan akun tersebut atau hubungi admin jika perlu bantuan pindah perangkat.`,
      }, { status: 409, headers: { "Cache-Control": "no-store" } });
      response.cookies.set(marketDeviceCookieName(), deviceToken, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: marketDeviceCookieMaxAge(),
      });
      return response;
    }

    await clearUserAuthAttempts(fingerprint, "login");
    const session = createMarketUserSession(user.id);
    const response = NextResponse.json({ ok: true, user: { id: user.id, username: user.username } }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(marketUserCookieName(), session.value, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: session.maxAge,
    });
    response.cookies.set(marketDeviceCookieName(), deviceToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: marketDeviceCookieMaxAge(),
    });
    return response;
  } catch (error) {
    console.error("User login failed:", error);
    return NextResponse.json({ error: "Login gagal diproses. Coba lagi." }, { status: 500 });
  }
}
