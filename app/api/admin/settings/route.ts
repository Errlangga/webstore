import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeWhatsApp(value: unknown) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

async function ensureSettingsTable() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS store_settings (
      key VARCHAR(80) PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  return sql;
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    const sql = await ensureSettingsTable();
    const rows = await sql`SELECT value FROM store_settings WHERE key = 'whatsapp_number' LIMIT 1`;
    return NextResponse.json({ settings: { whatsapp_number: typeof rows[0]?.value === "string" ? rows[0].value : "" } });
  } catch (error) {
    console.error("Admin settings read failed:", error);
    return NextResponse.json({ error: "Pengaturan store gagal dimuat." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    const body = await request.json() as { whatsapp_number?: unknown };
    const number = normalizeWhatsApp(body.whatsapp_number);
    if (number === null) {
      return NextResponse.json({ error: "Nomor WhatsApp harus berisi 8–15 digit internasional, misalnya 6281234567890." }, { status: 400 });
    }
    const sql = await ensureSettingsTable();
    await sql`
      INSERT INTO store_settings (key, value, updated_at)
      VALUES ('whatsapp_number', ${number}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
    return NextResponse.json({ ok: true, settings: { whatsapp_number: number }, message: "Nomor WhatsApp store berhasil disimpan." });
  } catch (error) {
    console.error("Admin settings update failed:", error);
    return NextResponse.json({ error: "Pengaturan store gagal disimpan." }, { status: 500 });
  }
}
