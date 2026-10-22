import Link from "next/link";

export default function NotFound() {
  return <div className="section-shell not-found"><span className="eyebrow">404 / NO MATCH</span><h1>Account not <span>found.</span></h1><p>Halaman yang lo cari nggak tersedia atau listing-nya sudah dihapus.</p><Link href="/stock" className="button button-primary">Kembali ke katalog <span>→</span></Link></div>;
}
