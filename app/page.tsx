import Link from "next/link";
import { redirect } from "next/navigation";
import { getMarketUser } from "@/lib/user-auth";
import ProductCard from "@/components/ProductCard";
import { getProducts, getTestimonials, getStoreSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await getMarketUser())) redirect("/account");
  const [products, testimonials, storeSettings] = await Promise.all([getProducts({ featured: true, availableOnly: true }), getTestimonials(true), getStoreSettings()]);
  return (
    <div className="home-page">
      <section className="hero section-shell">
        <div className="hero-copy">
          <img className="fc-mobile-logo" src={storeSettings.fc_mobile_logo_image || "/fc-mobile-logo.svg"} alt="EA SPORTS FC Mobile" width="250" height="64" />
          <div className="eyebrow"><span className="eyebrow-dot" /> FC MOBILE ACCOUNT MARKETPLACE <span className="eyebrow-line" /></div>
          <h1>BUILD YOUR<br /><span>NEXT SQUAD.</span></h1>
          <p className="hero-subtitle">Akun yang tepat. Skuad impian. Main dengan gaya lo sendiri.</p>
          <p className="hero-text">Jelajahi katalog akun dari admin dan seller komunitas. Buat listing milikmu sendiri, atur kontak seller, lalu komunikasikan transaksi secara langsung.</p>
          <div className="hero-actions"><Link href="/cari-akun" className="button button-primary">Cari akun <span>↗</span></Link><Link href="/testimoni" className="button button-ghost">Lihat Testimoni Rekber <span>→</span></Link></div>
          <div className="hero-proof"><div className="proof-avatars"><span>AS</span><span>FC</span><span>+</span></div><span>Info transparan, komunikasi langsung<br /><b>ke admin store</b></span></div>
        </div>
        <div className="hero-visual" aria-label="Foto kartu pemain FC Mobile">
          <div className="hero-stadium-glow" />
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-label label-top"><span>ASTRA MARKET</span><b>FC MOBILE PLAYER MARKET / 01</b></div>
          <img className="hero-player-card hero-player-bellingham" src={storeSettings.hero_card_image_1 || "/fc-mobile-card-bellingham.webp"} alt="Foto kartu pemain FC Mobile pertama" loading="eager" />
          <img className="hero-player-card hero-player-mbappe" src={storeSettings.hero_card_image_2 || "/fc-mobile-card-mbappe.webp"} alt="Foto kartu pemain FC Mobile kedua" loading="eager" />
          <div className="float-note float-rating"><span className="note-dot" /><div><small>PLAYER MARKET</small><b>Squad up.</b></div></div>
          <div className="float-note float-bottom"><span className="float-icon">↗</span><div><small>MADE FOR PLAYERS</small><b>Find your next star.</b></div></div>
          <div className="hero-label label-bottom"><b>FC MOBILE / 01</b><span>THE TRANSFER ROOM</span></div>
        </div>
      </section>

      <section className="trust-strip"><div><span className="trust-number">01</span><b>Detail transparan</b><small>Spesifikasi & harga jelas</small></div><div><span className="trust-number">02</span><b>Galeri akun</b><small>Foto dari admin store</small></div><div><span className="trust-number">03</span><b>Kontak langsung</b><small>Diskusi sebelum deal</small></div><div><span className="trust-number">04</span><b>Update stok</b><small>Label tersedia / terjual</small></div></section>

      <section className="section-shell section-block">
        <div className="section-heading"><div><div className="eyebrow">THE TRANSFER ROOM <span className="eyebrow-line" /></div><h2>Featured <span>accounts.</span></h2><p>Pilihan akun yang ditandai admin sebagai unggulan. Listing member yang tersedia bisa ditemukan lewat halaman Cari Akun.</p></div><Link href="/cari-akun" className="text-link">Cari semua akun <span>↗</span></Link></div>
        {products.length ? <div className="product-grid">{products.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="featured-empty"><div className="featured-empty-mark">A<span>✦</span></div><div><span className="mini-label">NEXT UP</span><h3>Slot featured siap diisi.</h3><p>Admin bisa menambahkan akun, foto katalog, harga, dan menandai produk unggulan lewat dashboard.</p></div><Link href="/cari-akun" className="button button-secondary">Cari semua akun <span>→</span></Link></div>}
      </section>

      <section className="manifesto section-shell"><div className="manifesto-index">OVR / PHILOSOPHY</div><div><div className="eyebrow">MORE THAN A NUMBER</div><h2>Find the account.<br /><span>Own the game.</span></h2></div><div className="manifesto-detail"><p>Belanja akun game seharusnya lebih gampang dipahami. Lihat detail dan foto yang tersedia, tanya admin kalau ada yang belum jelas, lalu putuskan dengan nyaman.</p><Link href="/cari-akun" className="text-link">Cari akun sekarang <span>↗</span></Link></div></section>

      <section className="section-shell section-block home-testimonials"><div className="section-heading"><div><div className="eyebrow">REKBER COMMUNITY <span className="eyebrow-line" /></div><h2>Testimoni <span>Rekber.</span></h2><p>Testimoni transaksi rekber yang dipilih dan dipublikasikan oleh admin.</p></div><Link href="/testimoni" className="text-link">Semua Testimoni Rekber <span>↗</span></Link></div>
        {testimonials.length ? <div className="testimonial-grid">{testimonials.slice(0, 3).map((item) => <article className="testimonial-card" key={item.id}><div className="testimonial-stars">{"★".repeat(item.rating)}<span>{"★".repeat(5 - item.rating)}</span></div><p>“{item.message}”</p>{item.image_url && <a className="proof-link" href={item.image_url} target="_blank" rel="noreferrer">Lihat bukti transaksi ↗</a>}<div className="testimonial-person"><span className="person-avatar">{item.buyer_name.slice(0,1).toUpperCase()}</span><div><b>{item.buyer_name}</b><small>{item.product_title}</small></div><span className="verified-mark">✓</span></div></article>)}</div> : <div className="simple-note"><span className="note-dot" /><p>Testimoni Rekber akan tampil di sini setelah dipublikasikan oleh admin.</p><Link href="/testimoni" className="text-link">Lihat Testimoni Rekber <span>→</span></Link></div>}
      </section>
      <section className="closing-cta section-shell"><div className="closing-glow" /><div className="eyebrow">READY TO LEVEL UP?</div><h2>Next move is <span>yours.</span></h2><p>Temukan akun yang cocok dengan target skuad lo.</p><Link href="/cari-akun" className="button button-primary">Jelajahi stok <span>↗</span></Link><span className="closing-coordinate">ASTRA MARKET / INDONESIA</span></section>
    </div>
  );
}
