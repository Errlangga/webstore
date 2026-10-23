import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatRupiah } from "@/lib/format";

export default function ProductCard({ product }: { product: Product }) {
  const cover = product.images?.[0];
  return (
    <article className="product-card">
      <Link href={`/stock/${product.slug}`} className="product-cover" aria-label={`Lihat ${product.title}`}>
        {cover ? <img src={cover} alt={product.title} loading="lazy" /> : (
          <div className="cover-placeholder"><span className="cover-overline">ASTRA MARKET / FC MOBILE</span><strong>{product.title.slice(0, 1).toUpperCase()}</strong><span className="cover-caption">SQUAD COLLECTION</span></div>
        )}
        <span className={product.status === "available" ? "stock-badge is-available" : "stock-badge is-sold"}>{product.status === "available" ? "● Tersedia" : "Terjual"}</span>
        {product.featured && <span className="featured-badge">PILIHAN</span>}
        <span className="cover-arrow" aria-hidden="true">↗</span>
      </Link>
      <div className="product-content">
        <div className="product-meta"><span>{product.category || "Akun FC Mobile"}</span><span>{product.seller_username ? "Seller @" + product.seller_username : product.players ? product.players.split(",").length + " pemain unggulan" : "Detail akun"}</span></div>
        <Link href={`/stock/${product.slug}`} className="product-title">{product.title}</Link>
        <p className="product-description">{product.description || "Hubungi admin untuk info lengkap akun ini."}</p>
        <div className="product-bottom"><div><small>HARGA</small><strong>{formatRupiah(Number(product.price))}</strong></div><Link href={`/stock/${product.slug}`} className="text-link">Lihat detail <span>→</span></Link></div>
      </div>
    </article>
  );
}
