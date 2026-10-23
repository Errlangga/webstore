import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMarketUser } from "@/lib/user-auth";
import { validateUserCatalog } from "@/lib/user-catalog";
import { assertOwnedBlobUrls, catalogFileUrls, cleanupUnusedBlobUrls, markBlobUrlsAttached } from "@/lib/blob-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

async function ownedCatalogId(context: Context, userId: number) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return { id, userId };
}

export async function PUT(request: Request, context: Context) {
  const user = await getMarketUser();
  if (!user) return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  const identity = await ownedCatalogId(context, user.id);
  if (!identity) return NextResponse.json({ error: "ID katalog tidak valid." }, { status: 400 });
  try {
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Format data katalog tidak valid." }, { status: 400 });
    }
    const validated = body && typeof body === "object"
      ? validateUserCatalog(body as Record<string, unknown>)
      : { error: "Format data katalog tidak valid." } as const;
    if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
    const p = validated.value;
    const sql = getDb();
    const previousRows = await sql`SELECT images, documents FROM user_catalogs WHERE id = ${identity.id} AND user_id = ${identity.userId} LIMIT 1`;
    if (!previousRows.length) return NextResponse.json({ error: "Katalog tidak ditemukan atau bukan milik akun kamu." }, { status: 404 });
    const previousUrls = catalogFileUrls(previousRows[0].images, previousRows[0].documents);
    const nextUrls = catalogFileUrls(p.images, p.documents);
    if (!(await assertOwnedBlobUrls(nextUrls, { type: "member", userId: user.id }, previousUrls))) {
      return NextResponse.json({ error: "Gunakan file yang diunggah dari akun kamu sendiri." }, { status: 400 });
    }
    const rows = await sql`
      UPDATE user_catalogs SET
        title = ${p.title},
        price = ${p.price},
        description = ${p.description},
        category = ${p.category},
        players = ${p.players},
        seller_whatsapp = ${p.seller_whatsapp},
        images = ${JSON.stringify(p.images)}::jsonb,
        documents = ${JSON.stringify(p.documents)}::jsonb,
        status = ${p.status},
        updated_at = NOW()
      WHERE id = ${identity.id} AND user_id = ${identity.userId}
      RETURNING id, user_id, title, slug, price, description, category, players, seller_whatsapp, images, documents, status, created_at, updated_at
    `;
    if (!rows.length) return NextResponse.json({ error: "Katalog tidak ditemukan atau bukan milik akun kamu." }, { status: 404 });
    await markBlobUrlsAttached(nextUrls, { type: "member", userId: user.id });
    await cleanupUnusedBlobUrls(previousUrls.filter((url) => !nextUrls.includes(url)));
    return NextResponse.json({ catalog: { ...rows[0], id: Number(rows[0].id), price: Number(rows[0].price) } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("User catalog update failed:", error);
    return NextResponse.json({ error: "Perubahan katalog gagal disimpan." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getMarketUser();
  if (!user) return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  const identity = await ownedCatalogId(context, user.id);
  if (!identity) return NextResponse.json({ error: "ID katalog tidak valid." }, { status: 400 });
  try {
    const sql = getDb();
    const rows = await sql`DELETE FROM user_catalogs WHERE id = ${identity.id} AND user_id = ${identity.userId} RETURNING images, documents`;
    if (!rows.length) return NextResponse.json({ error: "Katalog tidak ditemukan atau bukan milik akun kamu." }, { status: 404 });
    await cleanupUnusedBlobUrls(catalogFileUrls(rows[0].images, rows[0].documents));
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("User catalog delete failed:", error);
    return NextResponse.json({ error: "Katalog gagal dihapus." }, { status: 500 });
  }
}
