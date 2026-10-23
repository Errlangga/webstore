import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { assertOwnedBlobUrls, cleanupUnusedBlobUrls, markBlobUrlsAttached } from "@/lib/blob-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_SETTING_KEYS = ["hero_card_image_1", "hero_card_image_2", "fc_mobile_logo_image"] as const;

type ImageSettingKey = typeof IMAGE_SETTING_KEYS[number];
type StoreSettings = { whatsapp_number: string } & Record<ImageSettingKey, string>;

function normalizeWhatsApp(value: unknown) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (!value.trim()) return "";
  if (!digits || digits.length < 8 || digits.length > 15) return null;
  return digits;
}

function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.trim()) return "";
  if (value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function readSettings(): Promise<StoreSettings> {
  const sql = getDb();
  const rows = await sql`
    SELECT key, value
    FROM store_settings
    WHERE key IN ('whatsapp_number', 'hero_card_image_1', 'hero_card_image_2', 'fc_mobile_logo_image')
  `;
  const values: Record<string, string> = {};
  for (const row of rows) {
    if (typeof row.key === "string" && typeof row.value === "string") values[row.key] = row.value;
  }
  return {
    whatsapp_number: values.whatsapp_number || "",
    hero_card_image_1: values.hero_card_image_1 || "",
    hero_card_image_2: values.hero_card_image_2 || "",
    fc_mobile_logo_image: values.fc_mobile_logo_image || "",
  };
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    return NextResponse.json({ settings: await readSettings() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin settings read failed:", error);
    return NextResponse.json({ error: "Pengaturan store gagal dimuat." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const updates: Record<string, string> = {};

    if (Object.prototype.hasOwnProperty.call(body, "whatsapp_number")) {
      const number = normalizeWhatsApp(body.whatsapp_number);
      if (number === null) {
        return NextResponse.json({ error: "Nomor WhatsApp harus berisi 8–15 digit internasional, misalnya 6281234567890." }, { status: 400 });
      }
      updates.whatsapp_number = number;
    }

    for (const key of IMAGE_SETTING_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
      const url = normalizeImageUrl(body[key]);
      if (url === null) {
        return NextResponse.json({ error: "Foto harus berupa URL HTTPS yang valid. Upload foto lewat dashboard terlebih dahulu." }, { status: 400 });
      }
      updates[key] = url;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "Tidak ada pengaturan yang dikirim." }, { status: 400 });
    }

    const previous = await readSettings();
    const newImageUrls = IMAGE_SETTING_KEYS.map((key) => updates[key]).filter((value): value is string => typeof value === "string" && value.startsWith("https://"));
    const legacyUrls = IMAGE_SETTING_KEYS.map((key) => previous[key]).filter(Boolean);
    if (!(await assertOwnedBlobUrls(newImageUrls, { type: "admin" }, legacyUrls))) {
      return NextResponse.json({ error: "Foto pengaturan harus diunggah melalui dashboard admin." }, { status: 400 });
    }

    const sql = getDb();
    for (const [key, value] of Object.entries(updates)) {
      await sql`
        INSERT INTO store_settings (key, value, updated_at)
        VALUES (${key}, ${value}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    await markBlobUrlsAttached(newImageUrls, { type: "admin" });
    const nextImageUrls = IMAGE_SETTING_KEYS.map((key) => updates[key] ?? previous[key]).filter(Boolean);
    await cleanupUnusedBlobUrls(legacyUrls.filter((url) => !nextImageUrls.includes(url)));

    return NextResponse.json({
      ok: true,
      settings: await readSettings(),
      message: "Pengaturan store berhasil disimpan.",
    });
  } catch (error) {
    console.error("Admin settings update failed:", error);
    return NextResponse.json({ error: "Pengaturan store gagal disimpan." }, { status: 500 });
  }
}
