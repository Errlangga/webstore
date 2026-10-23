import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { checkUploadCapacity, cleanupExpiredPendingUploads, registerBlobUpload, safeBlobFileName, validateUploadFile } from "@/lib/blob-security";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Silakan login sebagai admin." }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL belum dikonfigurasi." }, { status: 503 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Upload belum aktif. Hubungkan Vercel Blob dan set BLOB_READ_WRITE_TOKEN." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const kindValue = form.get("kind");
    if (kindValue !== "image" && kindValue !== "document") {
      return NextResponse.json({ error: "Jenis upload tidak valid." }, { status: 400 });
    }
    const kind = kindValue;
    if (!(file instanceof File)) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    const validationError = await validateUploadFile(file, kind);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 415 });

    const owner = { type: "admin" as const };
    await cleanupExpiredPendingUploads(owner);
    const capacityError = await checkUploadCapacity(owner, kind, file.size);
    if (capacityError) {
      return NextResponse.json({ error: capacityError }, { status: 429, headers: { "Cache-Control": "no-store" } });
    }

    const prefix = kind === "document" ? "catalog/documents" : "catalog/images";
    const blob = await put(`${prefix}/${Date.now()}-${safeBlobFileName(file.name)}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
      cacheControlMaxAge: 31536000,
    });
    try {
      await registerBlobUpload(blob.url, owner, kind, file.size);
    } catch (error) {
      await del(blob.url).catch(() => {});
      throw error;
    }
    return NextResponse.json(
      { url: blob.url, name: safeBlobFileName(file.name), contentType: file.type, size: file.size, kind },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Catalog upload failed:", error);
    return NextResponse.json({ error: "Upload gagal. Periksa konfigurasi Vercel Blob lalu coba lagi." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
