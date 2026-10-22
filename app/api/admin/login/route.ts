import { NextResponse } from "next/server";
import { createAdminSession, adminCookieName, verifyAdminPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    return NextResponse.json({ error: "Admin belum dikonfigurasi. Periksa ADMIN_PASSWORD dan SESSION_SECRET di environment." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";
    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ error: "Password tidak cocok." }, { status: 401 });
    }

    const session = createAdminSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminCookieName(), session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: session.maxAge,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Permintaan login tidak valid." }, { status: 400 });
  }
}
