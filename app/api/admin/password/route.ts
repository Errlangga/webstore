import { NextResponse } from "next/server";
import { changeAdminPassword, isAdminAuthenticated, resetAdminPassword } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Silakan login sebagai admin." }, { status: 401 });
  }
  if (!process.env.DATABASE_URL || !process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Konfigurasi admin belum lengkap. Set ADMIN_PASSWORD di Vercel environment." }, { status: 503 });
  }

  let body: { action?: unknown; currentPassword?: unknown; newPassword?: unknown; confirmPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  try {
    if (body.action === "reset") {
      await resetAdminPassword();
      return NextResponse.json({ ok: true, message: "Password admin dikembalikan ke password awal." });
    }

    if (
      body.action !== "change" ||
      typeof body.currentPassword !== "string" ||
      typeof body.newPassword !== "string" ||
      typeof body.confirmPassword !== "string"
    ) {
      return NextResponse.json({ error: "Data perubahan password tidak lengkap." }, { status: 400 });
    }
    if (body.newPassword !== body.confirmPassword) {
      return NextResponse.json({ error: "Konfirmasi password baru tidak cocok." }, { status: 400 });
    }
    if (body.newPassword.length < 8 || body.newPassword.length > 128) {
      return NextResponse.json({ error: "Password baru harus berisi 8–128 karakter." }, { status: 400 });
    }
    if (body.newPassword === body.currentPassword) {
      return NextResponse.json({ error: "Password baru harus berbeda dari password saat ini." }, { status: 400 });
    }

    const changed = await changeAdminPassword(body.currentPassword, body.newPassword);
    if (!changed) return NextResponse.json({ error: "Password saat ini tidak cocok." }, { status: 401 });
    return NextResponse.json({ ok: true, message: "Password berhasil diubah." });
  } catch (error) {
    console.error("Admin password action failed:", error);
    return NextResponse.json({ error: "Password gagal diperbarui. Coba lagi nanti." }, { status: 500 });
  }
}
