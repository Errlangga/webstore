import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link href="/" className="brand footer-brand">
          <img className="brand-logo footer-logo" src="/astra-market-logo.svg" alt="Astra Market FC Mobile" width="280" height="58" />
        </Link>
        <p>Katalog akun FC Mobile dengan informasi yang jelas dan proses yang simpel.</p>
        <div className="footer-links"><Link href="/stock">Katalog</Link><Link href="/testimoni">Testimoni</Link><Link href="/admin">Admin</Link></div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} ASTRA MARKET</span><span>Independent fan store. Tidak berafiliasi dengan EA SPORTS atau FC Mobile.</span></div>
    </footer>
  );
}
