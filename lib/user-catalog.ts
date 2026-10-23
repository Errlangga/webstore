import type { ProductDocument, ProductStatus } from "@/lib/types";

export type UserCatalogInput = {
  title: string;
  price: number;
  description: string;
  category: string;
  players: string;
  seller_whatsapp: string;
  images: string[];
  documents: ProductDocument[];
  status: ProductStatus;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function validateUserCatalog(body: Record<string, unknown>) {
  const title = cleanText(body.title, 140);
  const price = Number(body.price);
  const description = cleanText(body.description, 6000);
  const category = cleanText(body.category, 80) || "Akun FC Mobile";
  const players = cleanText(body.players, 1200);
  const sellerRaw = cleanText(body.seller_whatsapp, 24);
  const seller_whatsapp = sellerRaw.replace(/\D/g, "");
  const status: ProductStatus = body.status === "sold" ? "sold" : "available";
  const images = Array.isArray(body.images)
    ? body.images.filter((url): url is string =>
        typeof url === "string" && url.length <= 2048 && url.startsWith("https://")
      ).slice(0, 10)
    : [];
  const documents = Array.isArray(body.documents)
    ? body.documents.filter((item): item is ProductDocument =>
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

  if (title.length < 3) return { error: "Judul katalog minimal 3 karakter." } as const;
  if (!Number.isFinite(price) || price < 0 || price > 999999999999) return { error: "Harga tidak valid." } as const;
  if (description.length < 5) return { error: "Deskripsi katalog minimal 5 karakter." } as const;
  if (seller_whatsapp.length < 8 || seller_whatsapp.length > 15) {
    return { error: "Nomor WhatsApp seller wajib diisi dengan 8–15 digit internasional, misalnya 6281234567890." } as const;
  }
  if (Array.isArray(body.images) && body.images.length > 10) return { error: "Maksimal 10 foto per katalog." } as const;
  if (Array.isArray(body.documents) && body.documents.length > 10) return { error: "Maksimal 10 dokumen per katalog." } as const;
  if (images.length !== (Array.isArray(body.images) ? body.images.length : 0)) return { error: "Foto katalog tidak valid." } as const;
  if (documents.length !== (Array.isArray(body.documents) ? body.documents.length : 0)) return { error: "Dokumen katalog tidak valid." } as const;

  return { value: { title, price: Math.round(price), description, category, players, seller_whatsapp, images, documents, status } satisfies UserCatalogInput } as const;
}
