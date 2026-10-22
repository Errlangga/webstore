import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

function safeFileName(value: string) {
  return value.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-100) || "file";
}

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
    const kind = form.get("kind") === "document" ? "document" : "image";
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }

    const allowedTypes = kind === "document" ? DOCUMENT_TYPES : IMAGE_TYPES;
    const maxBytes = kind === "document" ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({
        error: kind === "document"
          ? "Dokumen harus berupa PDF, TXT, CSV, DOC/DOCX, XLS/XLSX, atau PPTX."
          : "Format gambar harus JPG, PNG, WEBP, atau AVIF.",
      }, { status: 415 });
    }
    if (!file.size || file.size > maxBytes) {
      return NextResponse.json({ error: kind === "document" ? "Ukuran setiap dokumen maksimal 4 MB." : "Ukuran setiap gambar maksimal 4 MB." }, { status: 413 });
    }

    const safeName = safeFileName(file.name);
    const prefix = kind === "document" ? "catalog/documents" : "catalog/images";
    const blob = await put(`${prefix}/${Date.now()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
      cacheControlMaxAge: 31536000,
    });
    return NextResponse.json({
      url: blob.url,
      name: safeName,
      contentType: file.type,
      size: file.size,
      kind,
    });
  } catch (error) {
    console.error("Catalog upload failed:", error);
    return NextResponse.json({ error: "Upload gagal. Periksa konfigurasi Vercel Blob lalu coba lagi." }, { status: 500 });
  }
}
