import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://fc-mobile-store-efasa.vercel.app").replace(/\/$/, "");
  const products = await getProducts({ availableOnly: true });
  return [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/stock`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/testimoni`, changeFrequency: "weekly", priority: 0.5 },
    ...products.map((product) => ({ url: `${baseUrl}/stock/${product.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
  ];
}
