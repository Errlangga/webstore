import type { Metadata } from "next";
import StockGrid from "@/components/StockGrid";
import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Katalog akun FC Mobile" };

export default async function StockPage() {
  const products = await getProducts();
  const availableCount = products.filter((item) => item.status === "available").length;
  return (
    <div className="section-shell page-shell">
      <div className="page-intro"><div className="eyebrow"><span className="eyebrow-dot" /> THE TRANSFER ROOM <span className="eyebrow-line" /></div><h1>Account <span>catalogue.</span></h1><p>Temukan akun sesuai gaya main dan target skuad lo. Buka detail untuk melihat galeri, harga, dan menghubungi seller secara langsung.</p><div className="catalog-stats"><div><strong>{products.length.toString().padStart(2, "0")}</strong><span>Total listing</span></div><div><strong>{availableCount.toString().padStart(2, "0")}</strong><span>Tersedia</span></div><div><strong>LIVE</strong><span>Status stok</span></div></div></div>
      <StockGrid products={products} />
    </div>
  );
}
