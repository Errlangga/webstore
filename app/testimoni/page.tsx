import type { Metadata } from "next";
import { getTestimonials } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Testimoni pembeli" };

export default async function TestimonialsPage() {
  const testimonials = await getTestimonials(true);
  return (
    <div className="section-shell page-shell testimonials-page">
      <div className="page-intro"><div className="eyebrow"><span className="eyebrow-dot" /> COMMUNITY SIGNAL <span className="eyebrow-line" /></div><h1>Real player <span>feedback.</span></h1><p>Testimoni yang ditampilkan di halaman ini dipilih dan dipublikasikan oleh admin store. Selalu lakukan pengecekan sendiri sebelum transaksi.</p><div className="catalog-stats"><div><strong>{testimonials.length.toString().padStart(2, "0")}</strong><span>Testimoni tampil</span></div><div><strong>01</strong><span>Suara komunitas</span></div></div></div>
      {testimonials.length ? <div className="testimonial-grid full-testimonial-grid">{testimonials.map((item) => <article className="testimonial-card" key={item.id}><div className="testimonial-stars">{"★".repeat(item.rating)}<span>{"★".repeat(5 - item.rating)}</span></div><p>“{item.message}”</p>{item.image_url && <a className="proof-link" href={item.image_url} target="_blank" rel="noreferrer">Lihat bukti transaksi ↗</a>}<div className="testimonial-person"><span className="person-avatar">{item.buyer_name.slice(0,1).toUpperCase()}</span><div><b>{item.buyer_name}</b><small>{item.product_title}</small></div><span className="verified-mark">✓</span></div></article>)}</div> : <div className="empty-state"><span className="empty-icon">✳</span><h3>Belum ada testimoni yang dipublikasikan.</h3><p>Testimoni hanya akan tampil setelah admin menambahkan dan mempublikasikannya.</p></div>}
      <p className="testimonial-note">Tips: hindari mengirim password atau data pribadi ke pihak yang tidak dikenal. Pastikan transaksi dilakukan dengan pemahaman penuh atas ketentuan game.</p>
    </div>
  );
}
