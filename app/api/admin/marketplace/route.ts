import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { catalogFileUrls, cleanupUnusedBlobUrls } from "@/lib/blob-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    const sql = getDb();
    const [adminRows, memberRows] = await Promise.all([
      sql`
        SELECT id, title, slug, price, description, category, players, seller_whatsapp,
          images, documents, status, featured, created_at, updated_at,
          NULL::text AS seller_username, 'admin'::text AS source
        FROM products ORDER BY created_at DESC
      `,
      sql`
        SELECT c.id, c.title, c.slug, c.price, c.description, c.category, c.players,
          c.seller_whatsapp, c.images, c.documents, c.status, false AS featured,
          c.created_at, c.updated_at, u.username AS seller_username, 'member'::text AS source
        FROM user_catalogs c JOIN user_accounts u ON u.id = c.user_id
        ORDER BY c.created_at DESC
      `,
    ]);
    const listings = [...adminRows, ...memberRows]
      .map((row) => ({
        ...row,
        created_at: String(row.created_at),
        id: Number(row.id),
        price: Number(row.price),
        source: row.source === "member" ? "member" : "admin",
        seller_username: typeof row.seller_username === "string" ? row.seller_username : "",
        images: Array.isArray(row.images) ? row.images : [],
        documents: Array.isArray(row.documents) ? row.documents : [],
      }))
      .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime());
    return NextResponse.json({ listings }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin marketplace read failed:", error);
    return NextResponse.json({ error: "Katalog marketplace gagal dimuat." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
    }
    const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const id = Number(values.id);
    const source = values.source;
    if (!Number.isSafeInteger(id) || id <= 0 || (source !== "admin" && source !== "member")) {
      return NextResponse.json({ error: "ID atau sumber katalog tidak valid." }, { status: 400 });
    }
    const sql = getDb();
    const rows = source === "member"
      ? await sql`DELETE FROM user_catalogs WHERE id = ${id} RETURNING images, documents`
      : await sql`DELETE FROM products WHERE id = ${id} RETURNING images, documents`;
    if (!rows.length) return NextResponse.json({ error: "Katalog tidak ditemukan." }, { status: 404 });
    await cleanupUnusedBlobUrls(catalogFileUrls(rows[0].images, rows[0].documents));
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin marketplace delete failed:", error);
    return NextResponse.json({ error: "Katalog gagal dihapus." }, { status: 500 });
  }
}
