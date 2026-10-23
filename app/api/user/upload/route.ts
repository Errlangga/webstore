import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getMarketUser } from "@/lib/user-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const DOCUMENT_TYPES = new Set([
  "application/pdf", "text/plain", "text/csv", "application/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

function safeFileName(value: string) {
  return value.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-100) || "file";
}

export async function POST(request: Request) {
  const user = await getMarketUser();
  if (!user) return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Upload belum aktif. BLOB_READ_WRITE_TOKEN perlu diatur di Vercel." }, { status: 503 });
  }
  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = form.get("kind") === "document" ? "document" : "image";
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    const typeSet = kind === "document" ? DOCUMENT_TYPES : IMAGE_TYPES;
    if (!typeSet.has(file.type)) {
      return NextResponse.json({ error: kind === "document" ? "Format dokumen harus PDF, TXT, CSV, DOC/DOCX, XLS/XLSX, atau PPTX." : "Format foto harus JPG, PNG, WEBP, atau AVIF." }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Ukuran file maksimal 4 MB." }, { status: 413 });
    }
    const prefix = kind === "document" ? "member-catalog/documents" : "member-catalog/images";
    const blob = await put(`${prefix}/user-${user.id}/${Date.now()}-${safeFileName(file.name)}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
      cacheControlMaxAge: 31536000,
    });
    return NextResponse.json({ url: blob.url, name: safeFileName(file.name), contentType: file.type, size: file.size, kind });
  } catch (error) {
    console.error("User upload failed:", error);
    return NextResponse.json({ error: "Upload gagal. Coba lagi." }, { status: 500 });
  }
}
