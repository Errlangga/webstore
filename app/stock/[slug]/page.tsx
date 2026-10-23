import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMarketUser } from "@/lib/user-auth";
import ProductGallery from "@/components/ProductGallery";
import { getProductBySlug, getStoreSettings } from "@/lib/data";
import { formatRupiah, whatsappUrl } from "@/lib/format";
import WhatsAppIcon from "@/components/WhatsAppIcon";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!(await getMarketUser())) return { title: "Login untuk melihat akun", robots: { index: false, follow: false } };
  const product = await getProductBySlug(slug);
  return { title: product ? product.title : "Detail akun" };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  if (!(await getMarketUser())) redirect(`/account?mode=login&next=${encodeURIComponent(`/stock/${slug}`)}`);
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const storeSettings = await getStoreSettings();
  const hasSellerWhatsApp = Boolean(product.seller_whatsapp?.trim());
  const listingRef = product.source === "member" ? `MEMBER-${Math.abs(product.id)}` : String(product.id);
  const contactMessage = hasSellerWhatsApp
    ? `Halo seller, saya tertarik dengan akun: ${product.title} (ID katalog ${listingRef}) dari Astra Market FC Mobile. Boleh minta info selengkapnya?`
    : `Halo admin Astra Market FC Mobile, saya tertarik dengan akun: ${product.title} (ID katalog #${product.id}). Boleh minta info selengkapnya?`;
  const orderLink = whatsappUrl(contactMessage, hasSellerWhatsApp ? product.seller_whatsapp : storeSettings.whatsapp_number);
  const players = product.players.split(",").map((item) => item.trim()).filter(Boolean);
  return (
    <div className="section-shell detail-page">
      <div className="breadcrumb"><Link href="/">Beranda</Link><span>/</span><Link href="/cari-akun">Cari Akun</Link><span>/</span><span>{product.title}</span></div>
      <div className="detail-layout">
        <ProductGallery images={product.images || []} title={product.title} />
        <section className="detail-info">
          <div className="detail-tags"><span className="category-tag">{product.category || "Akun FC Mobile"}</span><span className={product.status === "available" ? "stock-text available" : "stock-text sold"}>{product.status === "available" ? "● STOK TERSEDIA" : "○ SUDAH TERJUAL"}</span></div>
          <h1>{product.title}</h1>
          {product.seller_username && <p className="member-seller-tag">Dipasang oleh <strong>@{product.seller_username}</strong></p>}
          <p className="detail-description">{product.description || "Hubungi admin untuk mendapatkan informasi lebih lanjut mengenai akun ini."}</p>
          <div className="price-panel"><span>HARGA YANG DITAWARKAN</span><strong>{formatRupiah(Number(product.price))}</strong><small>Harga dapat dikonfirmasi kembali ke seller sebelum transaksi.</small></div>
          {players.length > 0 && <div className="detail-spec"><h3>PLAYER HIGHLIGHTS</h3><div className="player-tags">{players.map((player) => <span key={player}>{player}</span>)}</div></div>}
          {product.documents?.length > 0 && <div className="detail-spec product-documents"><h3>DOKUMEN PENDUKUNG</h3><div className="product-document-links">{product.documents.map((document, index) => <a className="product-document-link" href={document.url} key={document.url + index} target="_blank" rel="noreferrer"><span className="document-file-icon" aria-hidden="true">↧</span><span><b>{document.name}</b><small>{document.contentType?.split("/").pop()?.toUpperCase() || "DOKUMEN"}{document.size ? ` · ${(document.size / 1024 / 1024).toFixed(1)} MB` : ""}</small></span><span className="document-open" aria-hidden="true">↗</span></a>)}</div></div>}
          <div className="detail-spec"><h3>SEBELUM TRANSAKSI</h3><ul className="detail-checklist"><li>Periksa foto galeri dan detail akun.</li><li>Tanyakan informasi yang belum tercantum ke seller.</li><li>Konfirmasi keamanan, metode serah terima, dan harga.</li></ul></div>
          {product.status === "available" ? <a className="button button-primary detail-order whatsapp-cta" href={orderLink} target="_blank" rel="noreferrer"><WhatsAppIcon className="whatsapp-icon" /> <span>{hasSellerWhatsApp ? "Chat seller via WhatsApp" : "Chat admin via WhatsApp"}</span> <span className="whatsapp-arrow" aria-hidden="true">↗</span></a> : <button className="button button-disabled" disabled>Stok sudah terjual</button>}
          <p className="detail-disclaimer">Astra Market FC Mobile adalah store independen. Pastikan seluruh ketentuan dan risiko transfer akun dipahami sebelum membeli.</p>
        </section>
      </div>
    </div>
  );
}
