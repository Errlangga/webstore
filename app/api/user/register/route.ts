import { NextResponse } from "next/server";
import {
  bindMarketDevice,
  createMarketDeviceToken,
  createMarketUserSession,
  getMarketDeviceBinding,
  getMarketDeviceToken,
  getMarketUser,
  hashMarketDeviceToken,
  isUserAuthRateLimited,
  marketDeviceCookieMaxAge,
  marketDeviceCookieName,
  marketUserCookieName,
  recordUserAuthAttempt,
  releaseUnboundMarketDevice,
  reserveMarketDevice,
  userAuthFingerprint,
  validateCredentials,
  registerMarketUser,
} from "@/lib/user-auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  const fingerprint = userAuthFingerprint(request);
  let reservedDeviceHash: string | null = null;
  let createdUserId: number | null = null;
  let deviceBound = false;

  try {
    if (await getMarketUser()) {
      return NextResponse.json({
        error: "Kamu sedang login. Logout tidak membuka izin untuk membuat akun tambahan; gunakan akun ini atau login ke akun yang sudah ada.",
      }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    const limit = await isUserAuthRateLimited(fingerprint, "register", 5);
    if (limit.limited) {
      return NextResponse.json({ error: "Terlalu banyak percobaan membuat akun. Coba lagi 15 menit lagi." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } });
    }
    await recordUserAuthAttempt(fingerprint, "register");

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
    }
    const credentials = body && typeof body === "object"
      ? validateCredentials((body as Record<string, unknown>).username, (body as Record<string, unknown>).password)
      : { error: "Format akun tidak valid." } as const;
    if ("error" in credentials) return NextResponse.json({ error: credentials.error }, { status: 400 });

    const deviceToken = await getMarketDeviceToken() || createMarketDeviceToken();
    const deviceHash = hashMarketDeviceToken(deviceToken);
    const reserved = await reserveMarketDevice(deviceHash);
    if (!reserved) {
      const binding = await getMarketDeviceBinding(deviceHash);
      const owner = binding?.username ? ` (@${binding.username})` : "";
      const response = NextResponse.json({
        error: `Perangkat/browser ini sudah pernah didaftarkan untuk akun member${owner}. Silakan pilih Login untuk masuk ke akun lama.`,
      }, { status: 409, headers: { "Cache-Control": "no-store" } });
      response.cookies.set(marketDeviceCookieName(), deviceToken, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: marketDeviceCookieMaxAge(),
      });
      return response;
    }
    reservedDeviceHash = deviceHash;

    const user = await registerMarketUser(credentials.username, credentials.usernameNormalized, credentials.password);
    if (!user) {
      await releaseUnboundMarketDevice(deviceHash);
      reservedDeviceHash = null;
      const response = NextResponse.json({ error: "Username sudah dipakai. Coba username lain." }, { status: 409, headers: { "Cache-Control": "no-store" } });
      response.cookies.set(marketDeviceCookieName(), deviceToken, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: marketDeviceCookieMaxAge(),
      });
      return response;
    }

    createdUserId = Number(user.id);
    deviceBound = await bindMarketDevice(deviceHash, createdUserId);
    if (!deviceBound) {
      const sql = getDb();
      await sql`DELETE FROM user_accounts WHERE id = ${createdUserId}`;
      createdUserId = null;
      await releaseUnboundMarketDevice(deviceHash);
      reservedDeviceHash = null;
      const response = NextResponse.json({ error: "Perangkat ini sudah terhubung dengan akun lain. Silakan login ke akun yang sudah terdaftar." }, { status: 409, headers: { "Cache-Control": "no-store" } });
      response.cookies.set(marketDeviceCookieName(), deviceToken, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: marketDeviceCookieMaxAge(),
      });
      return response;
    }

    reservedDeviceHash = null;
    const session = createMarketUserSession(createdUserId);
    const response = NextResponse.json({ ok: true, user: { id: createdUserId, username: String(user.username) } }, { status: 201, headers: { "Cache-Control": "no-store" } });
    response.cookies.set(marketUserCookieName(), session.value, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: session.maxAge,
    });
    response.cookies.set(marketDeviceCookieName(), deviceToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: marketDeviceCookieMaxAge(),
    });
    return response;
  } catch (error) {
    if (reservedDeviceHash && !deviceBound) {
      try {
        if (createdUserId) {
          const sql = getDb();
          await sql`DELETE FROM user_accounts WHERE id = ${createdUserId}`;
        }
        await releaseUnboundMarketDevice(reservedDeviceHash);
      } catch (cleanupError) {
        console.error("Member registration cleanup failed:", cleanupError);
      }
    }
    console.error("User registration failed:", error);
    return NextResponse.json({ error: "Akun gagal dibuat. Coba lagi." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
