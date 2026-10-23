import { getDb } from "@/lib/db";
import type { Product, Testimonial } from "@/lib/types";

export async function getProducts(options: { featured?: boolean; availableOnly?: boolean } = {}): Promise<Product[]> {
  if (!process.env.DATABASE_URL) return [];
  const sql = getDb();
  try {
    if (options.featured) {
      return await sql`SELECT * FROM products WHERE featured = true AND status = 'available' ORDER BY created_at DESC LIMIT 6` as Product[];
    }
    const adminRows = options.availableOnly
      ? await sql`SELECT * FROM products WHERE status = 'available' ORDER BY created_at DESC`
      : await sql`SELECT * FROM products ORDER BY created_at DESC`;
    let memberRows: Record<string, unknown>[] = [];
    try {
      memberRows = options.availableOnly
        ? await sql`
            SELECT (-c.id)::bigint AS id, c.title, c.slug, c.price, c.description, c.category,
              c.players, c.seller_whatsapp, c.images, c.documents, c.status, false AS featured,
              c.created_at, c.updated_at, u.username AS seller_username, 'member' AS source
            FROM user_catalogs c JOIN user_accounts u ON u.id = c.user_id
            WHERE c.status = 'available' ORDER BY c.created_at DESC
          `
        : await sql`
            SELECT (-c.id)::bigint AS id, c.title, c.slug, c.price, c.description, c.category,
              c.players, c.seller_whatsapp, c.images, c.documents, c.status, false AS featured,
              c.created_at, c.updated_at, u.username AS seller_username, 'member' AS source
            FROM user_catalogs c JOIN user_accounts u ON u.id = c.user_id
            ORDER BY c.created_at DESC
          `;
    } catch (error) {
      console.error("Failed to load member catalogs:", error);
    }
    const members = memberRows.map((row) => ({
      ...row,
      id: Number(row.id),
      price: Number(row.price),
      seller_username: String(row.seller_username || ""),
      source: "member" as const,
      images: Array.isArray(row.images) ? row.images as Product["images"] : [],
      documents: Array.isArray(row.documents) ? row.documents as Product["documents"] : [],
      featured: false,
    })) as Product[];
    return [...adminRows as Product[], ...members].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error("Failed to load products:", error);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM products WHERE slug = ${slug} LIMIT 1` as Product[];
    if (rows[0]) return rows[0];
    const memberRows = await sql`
      SELECT (-c.id)::bigint AS id, c.title, c.slug, c.price, c.description, c.category,
        c.players, c.seller_whatsapp, c.images, c.documents, c.status, false AS featured,
        c.created_at, c.updated_at, u.username AS seller_username, 'member' AS source
      FROM user_catalogs c JOIN user_accounts u ON u.id = c.user_id
      WHERE c.slug = ${slug}
      LIMIT 1
    `;
    const row = memberRows[0];
    if (!row) return null;
    return {
      ...row,
      id: Number(row.id),
      price: Number(row.price),
      seller_username: String(row.seller_username || ""),
      source: "member",
      images: Array.isArray(row.images) ? row.images as Product["images"] : [],
      documents: Array.isArray(row.documents) ? row.documents as Product["documents"] : [],
      featured: false,
    } as Product;
  } catch (error) {
    console.error("Failed to load product:", error);
    return null;
  }
}

export async function getTestimonials(visibleOnly = true): Promise<Testimonial[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const sql = getDb();
    if (visibleOnly) {
      return await sql`SELECT * FROM testimonials WHERE visible = true ORDER BY created_at DESC` as Testimonial[];
    }
    return await sql`SELECT * FROM testimonials ORDER BY created_at DESC` as Testimonial[];
  } catch (error) {
    console.error("Failed to load testimonials:", error);
    return [];
  }
}


export type StoreSettings = {
  whatsapp_number: string;
  hero_card_image_1: string;
  hero_card_image_2: string;
  fc_mobile_logo_image: string;
};

const EMPTY_STORE_SETTINGS: StoreSettings = {
  whatsapp_number: "",
  hero_card_image_1: "",
  hero_card_image_2: "",
  fc_mobile_logo_image: "",
};

export async function getStoreSettings(): Promise<StoreSettings> {
  if (!process.env.DATABASE_URL) return EMPTY_STORE_SETTINGS;
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT key, value
      FROM store_settings
      WHERE key IN ('whatsapp_number', 'hero_card_image_1', 'hero_card_image_2', 'fc_mobile_logo_image')
    `;
    const values: Record<string, string> = {};
    for (const row of rows) {
      if (typeof row.key === "string" && typeof row.value === "string") values[row.key] = row.value;
    }
    return {
      whatsapp_number: values.whatsapp_number || "",
      hero_card_image_1: values.hero_card_image_1 || "",
      hero_card_image_2: values.hero_card_image_2 || "",
      fc_mobile_logo_image: values.fc_mobile_logo_image || "",
    };
  } catch (error) {
    console.error("Failed to load store settings:", error);
    return EMPTY_STORE_SETTINGS;
  }
}
