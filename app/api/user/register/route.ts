import { NextResponse } from "next/server";
import { createMarketUserSession, isUserAuthRateLimited, marketUserCookieName, recordUserAuthAttempt, userAuthFingerprint, validateCredentials, registerMarketUser } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  const fingerprint = userAuthFingerprint(request);
  try {
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
    const user = await registerMarketUser(credentials.username, credentials.usernameNormalized, credentials.password);
    if (!user) return NextResponse.json({ error: "Username sudah dipakai. Coba username lain." }, { status: 409 });
    const session = createMarketUserSession(Number(user.id));
    const response = NextResponse.json({ ok: true, user: { id: Number(user.id), username: String(user.username) } }, { status: 201, headers: { "Cache-Control": "no-store" } });
    response.cookies.set(marketUserCookieName(), session.value, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: session.maxAge,
    });
    return response;
  } catch (error) {
    console.error("User registration failed:", error);
    return NextResponse.json({ error: "Akun gagal dibuat. Coba lagi." }, { status: 500 });
  }
}
