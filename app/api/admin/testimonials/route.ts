import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM testimonials ORDER BY created_at DESC`;
    return NextResponse.json({ testimonials: rows });
  } catch (error) {
    console.error("Testimonials read failed:", error);
    return NextResponse.json({ error: "Gagal membaca testimoni." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const buyer = typeof body.buyer_name === "string" ? body.buyer_name.trim().slice(0, 100) : "";
    const product = typeof body.product_title === "string" ? body.product_title.trim().slice(0, 140) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2500) : "";
    const rating = Number(body.rating);
    const image = typeof body.image_url === "string" && body.image_url.startsWith("https://") ? body.image_url : null;
    const visible = body.visible !== false;
    if (buyer.length < 2 || product.length < 2 || message.length < 5 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Nama, produk, pesan, atau rating belum valid." }, { status: 400 });
    }
    const sql = getDb();
    const rows = await sql`
      INSERT INTO testimonials (buyer_name, product_title, message, rating, image_url, visible)
      VALUES (${buyer}, ${product}, ${message}, ${rating}, ${image}, ${visible})
      RETURNING *
    `;
    return NextResponse.json({ testimonial: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Testimonial create failed:", error);
    return NextResponse.json({ error: "Testimoni gagal disimpan." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    const body = await request.json() as { id?: unknown; visible?: unknown };
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id <= 0 || typeof body.visible !== "boolean") {
      return NextResponse.json({ error: "Data testimoni tidak valid." }, { status: 400 });
    }
    const sql = getDb();
    const rows = await sql`UPDATE testimonials SET visible = ${body.visible} WHERE id = ${id} RETURNING *`;
    if (!rows.length) return NextResponse.json({ error: "Testimoni tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ testimonial: rows[0] });
  } catch (error) {
    console.error("Testimonial update failed:", error);
    return NextResponse.json({ error: "Status testimoni gagal diubah." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  try {
    const body = await request.json() as { id?: unknown };
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "ID testimoni tidak valid." }, { status: 400 });
    const sql = getDb();
    const rows = await sql`DELETE FROM testimonials WHERE id = ${id} RETURNING id`;
    if (!rows.length) return NextResponse.json({ error: "Testimoni tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Testimonial delete failed:", error);
    return NextResponse.json({ error: "Testimoni gagal dihapus." }, { status: 500 });
  }
}
