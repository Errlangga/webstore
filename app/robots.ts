import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fc-mobile-store.vercel.app";
  return {
    rules: [{ userAgent: "*", allow: ["/", "/stock", "/testimoni"], disallow: ["/admin", "/api/"] }],
    sitemap: `${baseUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
