import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMarketUser } from "@/lib/user-auth";
import StockGrid from "@/components/StockGrid";
import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Cari Akun FC Mobile",
  description: "Cari dan bandingkan akun FC Mobile yang tersedia dari Astra Market dan seller komunitas.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function CariAkunPage() {
  if (!(await getMarketUser())) redirect("/account?mode=login&next=%2Fcari-akun");
  const products = await getProducts({ availableOnly: true });
  const memberListings = products.filter((product) => product.source === "member").length;
  return (
    <div className="section-shell page-shell cari-akun-page">
      <div className="page-intro">
        <div className="eyebrow"><span className="eyebrow-dot" /> MARKETPLACE / FIND YOUR ACCOUNT <span className="eyebrow-line" /></div>
        <h1>Cari <span>Akun.</span></h1>
        <p>Semua listing akun FC Mobile yang masih tersedia dikumpulkan di sini. Cari berdasarkan nama akun, OVR, pemain, atau kategori, lalu buka detail untuk mengecek harga dan menghubungi seller.</p>
        <div className="catalog-stats">
          <div><strong>{products.length.toString().padStart(2, "0")}</strong><span>Akun tersedia</span></div>
          <div><strong>{memberListings.toString().padStart(2, "0")}</strong><span>Dari seller member</span></div>
          <div><strong>LIVE</strong><span>Stok tersedia</span></div>
        </div>
      </div>
      <StockGrid products={products} />
      <p className="testimonial-note">Sebelum deal, konfirmasi ulang harga, detail akun, metode serah terima, dan aturan layanan rekber kepada admin. Jangan bagikan password atau kode OTP di chat publik.</p>
    </div>
  );
}
