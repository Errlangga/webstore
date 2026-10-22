import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSession, adminCookieName, verifyAdminPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

function fingerprintRequest(request: Request) {
  const ip = request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const key = process.env.SESSION_SECRET || process.env.DATABASE_URL || "admin-login-limit";
  return createHmac("sha256", key).update(ip).digest("hex");
}

async function recordAttemptAndCheckLimit(fingerprint: string) {
  const sql = getDb();
  await sql`DELETE FROM admin_login_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours'`;
  await sql`INSERT INTO admin_login_attempts (fingerprint) VALUES (${fingerprint})`;
  const rows = await sql`
    SELECT COUNT(*)::int AS attempts, MIN(attempted_at) AS oldest
    FROM admin_login_attempts
    WHERE fingerprint = ${fingerprint}
      AND attempted_at > NOW() - INTERVAL '15 minutes'
  `;
  const attempts = Number(rows[0]?.attempts || 0);
  if (attempts <= MAX_ATTEMPTS) return { limited: false, retryAfter: 0 };

  const oldest = rows[0]?.oldest ? new Date(rows[0].oldest as string | Date).getTime() : Date.now();
  const retryAfter = Math.max(1, Math.ceil((oldest + WINDOW_MINUTES * 60_000 - Date.now()) / 1000));
  return { limited: true, retryAfter };
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL || !process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Admin belum dikonfigurasi. Set DATABASE_URL dan ADMIN_PASSWORD di Vercel environment." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const fingerprint = fingerprintRequest(request);
    const limit = await recordAttemptAndCheckLimit(fingerprint);
    if (limit.limited) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan login. Coba lagi setelah beberapa menit." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Permintaan login tidak valid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const password = body && typeof body === "object" && "password" in body && typeof body.password === "string"
      ? body.password
      : "";
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: "Password tidak cocok." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const sql = getDb();
    await sql`DELETE FROM admin_login_attempts WHERE fingerprint = ${fingerprint}`;
    const session = createAdminSession();
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(adminCookieName(), session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: session.maxAge,
    });
    return response;
  } catch (error) {
    console.error("Admin login request failed:", error);
    return NextResponse.json(
      { error: "Login tidak dapat diproses sekarang. Coba lagi nanti." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
