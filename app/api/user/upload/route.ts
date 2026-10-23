import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getMarketUser } from "@/lib/user-auth";
import { checkUploadCapacity, cleanupExpiredPendingUploads, registerBlobUpload, safeBlobFileName, validateUploadFile } from "@/lib/blob-security";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const user = await getMarketUser();
  if (!user) return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Upload belum aktif. BLOB_READ_WRITE_TOKEN perlu diatur di Vercel." }, { status: 503 });
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

    const owner = { type: "member" as const, userId: user.id };
    await cleanupExpiredPendingUploads(owner);
    const capacityError = await checkUploadCapacity(owner, kind, file.size);
    if (capacityError) {
      return NextResponse.json({ error: capacityError }, { status: 429, headers: { "Cache-Control": "no-store" } });
    }

    const prefix = kind === "document" ? "member-catalog/documents" : "member-catalog/images";
    const blob = await put(`${prefix}/user-${user.id}/${Date.now()}-${safeBlobFileName(file.name)}`, file, {
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
    console.error("User upload failed:", error);
    return NextResponse.json({ error: "Upload gagal. Coba lagi." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
