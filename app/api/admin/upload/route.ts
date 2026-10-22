import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Silakan login sebagai admin." }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Upload belum aktif. Hubungkan Vercel Blob dan set BLOB_READ_WRITE_TOKEN." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File gambar tidak ditemukan." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Format harus JPG, PNG, WEBP, atau AVIF." }, { status: 415 });
    }
    if (!file.size || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Ukuran setiap gambar maksimal 4 MB." }, { status: 413 });
    }

    const extension = file.type.split("/")[1].replace("jpeg", "jpg");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
    const blob = await put(`catalog/${Date.now()}-${safeName || `image.${extension}`}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
      cacheControlMaxAge: 31536000,
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Image upload failed:", error);
    return NextResponse.json({ error: "Upload gagal. Periksa konfigurasi Vercel Blob lalu coba lagi." }, { status: 500 });
  }
}
