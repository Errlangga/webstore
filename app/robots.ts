import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fc-mobile-store-efasa.vercel.app";
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/testimoni"],
      disallow: [
        "/api/",
        "/account",
        "/my-katalog",
        "/cari-akun",
        "/stock/",
        "/admin",
        process.env.ADMIN_DASHBOARD_PATH || "/admin",
      ],
    }],
    sitemap: `${baseUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
