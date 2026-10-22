import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validateProduct(body: Record<string, unknown>) {
  const title = cleanText(body.title, 140);
  const price = Number(body.price);
  const description = cleanText(body.description, 6000);
  const category = cleanText(body.category, 80) || "Akun FC Mobile";
  const players = cleanText(body.players, 1200);
  const sellerWhatsappRaw = cleanText(body.seller_whatsapp, 24);
  const sellerWhatsapp = sellerWhatsappRaw.replace(/\D/g, "");
  const status = body.status === "sold" ? "sold" : "available";
  const featured = body.featured === true;
  const images = Array.isArray(body.images)
    ? body.images.filter((url): url is string => typeof url === "string" && url.startsWith("https://") && url.includes(".")).slice(0, 10)
    : [];
  const documents = Array.isArray(body.documents)
    ? body.documents.filter((item): item is { url: string; name: string; contentType?: string; size?: number } =>
        !!item && typeof item === "object" &&
        typeof (item as { url?: unknown }).url === "string" &&
        (item as { url: string }).url.startsWith("https://") &&
        typeof (item as { name?: unknown }).name === "string" &&
        (item as { name: string }).name.trim().length > 0
      ).slice(0, 10).map((item) => ({
        url: item.url.slice(0, 2048),
        name: item.name.trim().replace(/[\\/]/g, "-").slice(0, 160),
        contentType: typeof item.contentType === "string" ? item.contentType.slice(0, 120) : "application/octet-stream",
        size: Number.isFinite(item.size) ? Math.max(0, Math.min(Number(item.size), 4 * 1024 * 1024)) : 0,
      }))
    : [];
  if (title.length < 3) return { error: "Judul produk minimal 3 karakter." } as const;
  if (!Number.isFinite(price) || price < 0 || price > 999999999999) return { error: "Harga tidak valid." } as const;
  if (description.length < 5) return { error: "Deskripsi produk minimal 5 karakter." } as const;
  if (sellerWhatsappRaw && (sellerWhatsapp.length < 8 || sellerWhatsapp.length > 15)) {
    return { error: "Nomor WhatsApp seller harus 8–15 digit internasional, misalnya 6281234567890." } as const;
  }
  return { title, price: Math.round(price), description, category, players, seller_whatsapp: sellerWhatsapp, status, featured, images, documents } as const;
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM products ORDER BY created_at DESC`;
    return NextResponse.json({ products: rows });
  } catch (error) {
    console.error("Admin products read failed:", error);
    return NextResponse.json({ error: "Gagal membaca produk dari database." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const product = validateProduct(body);
    if ("error" in product) return NextResponse.json({ error: product.error }, { status: 400 });
    const sql = getDb();
    const baseSlug = slugify(product.title) || "akun-fc-mobile";
    const existing = await sql`SELECT id FROM products WHERE slug = ${baseSlug} LIMIT 1`;
    const slug = existing.length ? `${baseSlug}-${Date.now().toString().slice(-6)}` : baseSlug;
    const rows = await sql`
      INSERT INTO products (title, slug, price, description, category, players, seller_whatsapp, images, documents, status, featured)
      VALUES (${product.title}, ${slug}, ${product.price}, ${product.description}, ${product.category}, ${product.players}, ${product.seller_whatsapp}, ${JSON.stringify(product.images)}::jsonb, ${JSON.stringify(product.documents)}::jsonb, ${product.status}, ${product.featured})
      RETURNING *
    `;
    return NextResponse.json({ product: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Product create failed:", error);
    return NextResponse.json({ error: "Produk gagal disimpan. Coba lagi." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "ID produk tidak valid." }, { status: 400 });
    const product = validateProduct(body);
    if ("error" in product) return NextResponse.json({ error: product.error }, { status: 400 });
    const sql = getDb();
    const currentRows = await sql`SELECT slug FROM products WHERE id = ${id} LIMIT 1`;
    if (!currentRows.length) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    const currentSlug = String(currentRows[0].slug);
    let slug = currentSlug;
    const nextBaseSlug = slugify(product.title) || "akun-fc-mobile";
    if (nextBaseSlug !== currentSlug) {
      const conflicts = await sql`SELECT id FROM products WHERE slug = ${nextBaseSlug} AND id <> ${id} LIMIT 1`;
      slug = conflicts.length ? `${nextBaseSlug}-${id}` : nextBaseSlug;
    }
    const rows = await sql`
      UPDATE products SET
        title = ${product.title}, slug = ${slug}, price = ${product.price},
        description = ${product.description}, category = ${product.category}, players = ${product.players},
        seller_whatsapp = ${product.seller_whatsapp}, images = ${JSON.stringify(product.images)}::jsonb, documents = ${JSON.stringify(product.documents)}::jsonb, status = ${product.status},
        featured = ${product.featured}, updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;
    return NextResponse.json({ product: rows[0] });
  } catch (error) {
    console.error("Product update failed:", error);
    return NextResponse.json({ error: "Perubahan produk gagal disimpan." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    const body = await request.json() as { id?: unknown };
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "ID produk tidak valid." }, { status: 400 });
    const sql = getDb();
    const rows = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
    if (!rows.length) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Product delete failed:", error);
    return NextResponse.json({ error: "Produk gagal dihapus." }, { status: 500 });
  }
}
