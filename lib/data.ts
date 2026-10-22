import { getDb } from "@/lib/db";
import type { Product, Testimonial } from "@/lib/types";

export async function getProducts(options: { featured?: boolean; availableOnly?: boolean } = {}): Promise<Product[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const sql = getDb();
    const featured = options.featured;
    const availableOnly = options.availableOnly;
    if (featured && availableOnly) {
      return await sql`SELECT * FROM products WHERE featured = true AND status = 'available' ORDER BY created_at DESC LIMIT 6` as Product[];
    }
    if (featured) {
      return await sql`SELECT * FROM products WHERE featured = true ORDER BY created_at DESC LIMIT 6` as Product[];
    }
    if (availableOnly) {
      return await sql`SELECT * FROM products WHERE status = 'available' ORDER BY created_at DESC` as Product[];
    }
    return await sql`SELECT * FROM products ORDER BY created_at DESC` as Product[];
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
    return rows[0] ?? null;
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


export type StoreSettings = { whatsapp_number: string };

export async function getStoreSettings(): Promise<StoreSettings> {
  if (!process.env.DATABASE_URL) return { whatsapp_number: "" };
  try {
    const sql = getDb();
    const rows = await sql`SELECT value FROM store_settings WHERE key = 'whatsapp_number' LIMIT 1`;
    return { whatsapp_number: typeof rows[0]?.value === "string" ? rows[0].value : "" };
  } catch (error) {
    console.error("Failed to load store settings:", error);
    return { whatsapp_number: "" };
  }
}
