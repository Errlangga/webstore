import { del } from "@vercel/blob";
import { getDb } from "@/lib/db";

export type BlobOwner =
  | { type: "admin" }
  | { type: "member"; userId: number };

export type UploadKind = "image" | "document";

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const DOCUMENT_MIMES = new Set([
  "application/pdf", "text/plain", "text/csv", "application/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const EXTENSION_MIMES: Record<string, Set<string>> = {
  jpg: new Set(["image/jpeg"]), jpeg: new Set(["image/jpeg"]),
  png: new Set(["image/png"]), webp: new Set(["image/webp"]), avif: new Set(["image/avif"]),
  pdf: new Set(["application/pdf"]), txt: new Set(["text/plain"]),
  csv: new Set(["text/csv", "application/csv"]),
  doc: new Set(["application/msword"]),
  docx: new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  xls: new Set(["application/vnd.ms-excel"]),
  xlsx: new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]),
  pptx: new Set(["application/vnd.openxmlformats-officedocument.presentationml.presentation"]),
};

export function safeBlobFileName(value: string) {
  return value.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-100) || "file";
}

export async function validateUploadFile(file: File, kind: UploadKind): Promise<string | null> {
  const mime = file.type.toLowerCase();
  const allowed = kind === "image" ? IMAGE_MIMES : DOCUMENT_MIMES;
  if (!allowed.has(mime)) return kind === "image"
    ? "Format foto harus JPG, PNG, WEBP, atau AVIF."
    : "Format dokumen harus PDF, TXT, CSV, DOC/DOCX, XLS/XLSX, atau PPTX.";
  if (!file.size || file.size > 4 * 1024 * 1024) return "Ukuran setiap file maksimal 4 MB.";

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!EXTENSION_MIMES[extension]?.has(mime)) return "Ekstensi file tidak cocok dengan format file yang diizinkan.";
  const contents = Buffer.from(await file.arrayBuffer());
  const bytes = contents.subarray(0, 64);
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  const isAvif = bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp" &&
    ["avif", "avis"].includes(bytes.toString("ascii", 8, 12));
  const isPdf = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  const isOle = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

  if (kind === "image") {
    const valid = mime === "image/jpeg" ? isJpeg : mime === "image/png" ? isPng :
      mime === "image/webp" ? isWebp : isAvif;
    return valid ? null : "Isi file tidak cocok dengan format foto yang dipilih.";
  }
  if (mime === "application/pdf") return isPdf ? null : "Isi file bukan dokumen PDF yang valid.";
  if (mime === "application/msword" || mime === "application/vnd.ms-excel") {
    return isOle ? null : "Isi file tidak cocok dengan format Office yang dipilih.";
  }
  if (mime.startsWith("application/vnd.openxmlformats-officedocument.")) {
    if (!isZip) return "Isi file tidak cocok dengan format Office yang dipilih.";
    const zipNames = contents.toString("latin1");
    const expectedEntry = mime.includes("wordprocessingml") ? "word/document.xml"
      : mime.includes("spreadsheetml") ? "xl/workbook.xml"
      : "ppt/presentation.xml";
    return zipNames.includes("[Content_Types].xml") && zipNames.includes(expectedEntry)
      ? null : "Struktur dokumen Office tidak valid.";
  }
  if (mime === "text/plain" || mime === "text/csv" || mime === "application/csv") {
    if (contents.includes(0)) return "File teks tidak boleh berisi data biner.";
    try { new TextDecoder("utf-8", { fatal: true }).decode(contents); }
    catch { return "File teks harus menggunakan encoding UTF-8."; }
    return null;
  }
  return "Format file tidak diizinkan.";
}

export function catalogFileUrls(images: unknown, documents: unknown): string[] {
  const imageUrls = Array.isArray(images)
    ? images.filter((url): url is string => typeof url === "string" && url.startsWith("https://"))
    : [];
  const documentUrls = Array.isArray(documents)
    ? documents.flatMap((item) => item && typeof item === "object" &&
      typeof (item as { url?: unknown }).url === "string" &&
      (item as { url: string }).url.startsWith("https://") ? [(item as { url: string }).url] : [])
    : [];
  return Array.from(new Set([...imageUrls, ...documentUrls]));
}

export function testimonialFileUrls(imageUrl: unknown): string[] {
  return typeof imageUrl === "string" && imageUrl.startsWith("https://") ? [imageUrl] : [];
}

export async function assertOwnedBlobUrls(
  urls: string[],
  owner: BlobOwner,
  legacyAllowed: string[] = [],
): Promise<boolean> {
  const sql = getDb();
  const requested = Array.from(new Set(urls.filter((url) => url.startsWith("https://") && !legacyAllowed.includes(url))));
  if (!requested.length) return true;
  const unmatched = owner.type === "admin"
    ? await sql`
        SELECT requested.url
        FROM jsonb_array_elements_text(${JSON.stringify(requested)}::jsonb) AS requested(url)
        LEFT JOIN catalog_uploads upload ON upload.blob_url = requested.url
          AND upload.uploader_type = 'admin' AND upload.user_id IS NULL
        WHERE upload.id IS NULL LIMIT 1
      `
    : await sql`
        SELECT requested.url
        FROM jsonb_array_elements_text(${JSON.stringify(requested)}::jsonb) AS requested(url)
        LEFT JOIN catalog_uploads upload ON upload.blob_url = requested.url
          AND upload.uploader_type = 'member' AND upload.user_id = ${owner.userId}
        WHERE upload.id IS NULL LIMIT 1
      `;
  return unmatched.length === 0;
}

export async function markBlobUrlsAttached(urls: string[], owner: BlobOwner) {
  const uniqueUrls = Array.from(new Set(urls.filter((url) => url.startsWith("https://"))));
  if (!uniqueUrls.length) return;
  const sql = getDb();
  if (owner.type === "admin") {
    await sql`
      UPDATE catalog_uploads SET attached = true
      WHERE uploader_type = 'admin' AND user_id IS NULL
        AND blob_url IN (SELECT jsonb_array_elements_text(${JSON.stringify(uniqueUrls)}::jsonb))
    `;
  } else {
    await sql`
      UPDATE catalog_uploads SET attached = true
      WHERE uploader_type = 'member' AND user_id = ${owner.userId}
        AND blob_url IN (SELECT jsonb_array_elements_text(${JSON.stringify(uniqueUrls)}::jsonb))
    `;
  }
}

export async function checkUploadCapacity(owner: BlobOwner, kind: UploadKind, nextBytes: number) {
  const sql = getDb();
  const rows = owner.type === "admin"
    ? await sql`
        SELECT
          COUNT(*) FILTER (WHERE attached AND file_kind = 'image')::int AS image_count,
          COUNT(*) FILTER (WHERE attached AND file_kind = 'document')::int AS document_count,
          COALESCE(SUM(byte_size) FILTER (WHERE attached), 0)::bigint AS storage_bytes,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS daily_count,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '15 minutes')::int AS recent_count
        FROM catalog_uploads WHERE uploader_type = 'admin' AND user_id IS NULL
      `
    : await sql`
        SELECT
          COUNT(*) FILTER (WHERE attached AND file_kind = 'image')::int AS image_count,
          COUNT(*) FILTER (WHERE attached AND file_kind = 'document')::int AS document_count,
          COALESCE(SUM(byte_size) FILTER (WHERE attached), 0)::bigint AS storage_bytes,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS daily_count,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '15 minutes')::int AS recent_count
        FROM catalog_uploads WHERE uploader_type = 'member' AND user_id = ${owner.userId}
      `;
  const row = rows[0] || {};
  const imageCount = Number(row.image_count || 0);
  const documentCount = Number(row.document_count || 0);
  const storageBytes = Number(row.storage_bytes || 0);
  const dailyCount = Number(row.daily_count || 0);
  const recentCount = Number(row.recent_count || 0);
  const isAdmin = owner.type === "admin";
  if (recentCount >= (isAdmin ? 30 : 12)) return "Terlalu banyak upload dalam 15 menit. Coba lagi nanti.";
  if (dailyCount >= (isAdmin ? 100 : 40)) return isAdmin ? "Batas upload admin 100 file per 24 jam tercapai." : "Batas upload member 40 file per 24 jam tercapai.";
  if (kind === "image" && imageCount >= (isAdmin ? 200 : 30)) return isAdmin ? "Kuota foto admin tercapai." : "Maksimal 30 foto tersimpan per member.";
  if (kind === "document" && documentCount >= (isAdmin ? 200 : 30)) return isAdmin ? "Kuota dokumen admin tercapai." : "Maksimal 30 dokumen tersimpan per member.";
  const storageLimit = (isAdmin ? 1024 : 240) * 1024 * 1024;
  if (storageBytes + nextBytes > storageLimit) return isAdmin ? "Kuota penyimpanan katalog admin tercapai." : "Kuota penyimpanan katalog member 240 MB tercapai.";
  return null;
}

export async function registerBlobUpload(url: string, owner: BlobOwner, kind: UploadKind, byteSize: number) {
  const sql = getDb();
  await sql`
    INSERT INTO catalog_uploads (blob_url, uploader_type, user_id, file_kind, byte_size, attached)
    VALUES (${url}, ${owner.type}, ${owner.type === "member" ? owner.userId : null}, ${kind}, ${byteSize}, false)
  `;
}

export async function cleanupUnusedBlobUrls(urls: string[]) {
  const sql = getDb();
  for (const url of Array.from(new Set(urls.filter((value) => value.startsWith("https://"))))) {
    try {
      const registered = await sql`SELECT blob_url FROM catalog_uploads WHERE blob_url = ${url} LIMIT 1`;
      if (!registered.length) continue;
      const references = await sql`
        SELECT (
          EXISTS (SELECT 1 FROM products p WHERE
            EXISTS (SELECT 1 FROM jsonb_array_elements_text(p.images) image(url) WHERE image.url = ${url}) OR
            EXISTS (SELECT 1 FROM jsonb_array_elements(p.documents) doc(item) WHERE doc.item->>'url' = ${url})
          ) OR EXISTS (SELECT 1 FROM user_catalogs c WHERE
            EXISTS (SELECT 1 FROM jsonb_array_elements_text(c.images) image(url) WHERE image.url = ${url}) OR
            EXISTS (SELECT 1 FROM jsonb_array_elements(c.documents) doc(item) WHERE doc.item->>'url' = ${url})
          ) OR EXISTS (SELECT 1 FROM testimonials t WHERE t.image_url = ${url})
            OR EXISTS (SELECT 1 FROM store_settings s WHERE s.value = ${url})
        ) AS used
      `;
      if (references[0]?.used) continue;
      await del(url);
      await sql`DELETE FROM catalog_uploads WHERE blob_url = ${url}`;
    } catch (error) {
      console.error("Blob cleanup failed:", error);
    }
  }
}

export async function cleanupExpiredPendingUploads(owner: BlobOwner) {
  const sql = getDb();
  const rows = owner.type === "admin"
    ? await sql`SELECT blob_url FROM catalog_uploads WHERE uploader_type = 'admin' AND user_id IS NULL AND attached = false AND created_at < NOW() - INTERVAL '1 hour' ORDER BY created_at ASC LIMIT 50`
    : await sql`SELECT blob_url FROM catalog_uploads WHERE uploader_type = 'member' AND user_id = ${owner.userId} AND attached = false AND created_at < NOW() - INTERVAL '1 hour' ORDER BY created_at ASC LIMIT 50`;
  if (rows.length) await cleanupUnusedBlobUrls(rows.map((row) => String(row.blob_url)));
}
