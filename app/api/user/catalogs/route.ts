import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/format";
import { getMarketUser } from "@/lib/user-auth";
import { validateUserCatalog } from "@/lib/user-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getMarketUser();
  if (!user) return NextResponse.json({ error: "Silakan login dulu." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT id, user_id, title, slug, price, description, category, players, seller_whatsapp, images, documents, status, created_at, updated_at
      FROM user_catalogs
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ catalogs: rows.map((row) => ({ ...row, id: Number(row.id), price: Number(row.price), images: Array.isArray(row.images) ? row.images : [], documents: Array.isArray(row.documents) ? row.documents : [] })), limit: 3 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("User catalog list failed:", error);
    return NextResponse.json({ error: "Katalog kamu gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getMarketUser();
  if (!user) return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  try {
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Format data katalog tidak valid." }, { status: 400 });
    }
    const validated = body && typeof body === "object"
      ? validateUserCatalog(body as Record<string, unknown>)
      : { error: "Format data katalog tidak valid." } as const;
    if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
    const product = validated.value;
    const sql = getDb();
    const countRows = await sql`SELECT COUNT(*)::int AS total FROM user_catalogs WHERE user_id = ${user.id}`;
    if (Number(countRows[0]?.total || 0) >= 3) {
      return NextResponse.json({ error: "Batas maksimal 3 katalog per akun sudah tercapai. Edit atau hapus katalog lama dulu." }, { status: 409 });
    }
    const baseSlug = slugify(product.title) || "akun-fc-mobile";
    const slug = `member-${user.id}-${baseSlug}-${Date.now().toString(36)}`;
    const rows = await sql`
      INSERT INTO user_catalogs (user_id, title, slug, price, description, category, players, seller_whatsapp, images, documents, status)
      VALUES (
        ${user.id}, ${product.title}, ${slug}, ${product.price}, ${product.description}, ${product.category},
        ${product.players}, ${product.seller_whatsapp}, ${JSON.stringify(product.images)}::jsonb,
        ${JSON.stringify(product.documents)}::jsonb, ${product.status}
      )
      RETURNING id, user_id, title, slug, price, description, category, players, seller_whatsapp, images, documents, status, created_at, updated_at
    `;
    return NextResponse.json({ catalog: { ...rows[0], id: Number(rows[0].id), price: Number(rows[0].price) }, limit: 3 }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("USER_CATALOG_LIMIT")) {
      return NextResponse.json({ error: "Batas maksimal 3 katalog per akun sudah tercapai." }, { status: 409 });
    }
    console.error("User catalog create failed:", error);
    return NextResponse.json({ error: "Katalog gagal dibuat. Coba lagi." }, { status: 500 });
  }
}
