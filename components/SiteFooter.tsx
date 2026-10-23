import Link from "next/link";
import { getStoreSettings } from "@/lib/data";
import { whatsappUrl } from "@/lib/format";

export default async function SiteFooter() {
  const settings = await getStoreSettings();
  const postingUrl = whatsappUrl("Halo admin Astra Market FC Mobile, saya ingin menggunakan jasa rekber / midman. Boleh minta informasi alur dan biayanya?", settings.whatsapp_number);
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link href="/" className="brand footer-brand">
          <img className="brand-logo footer-logo" src="/astra-market-logo.svg" alt="Astra Market FC Mobile" width="280" height="58" />
        </Link>
        <p>Katalog akun FC Mobile dengan informasi yang jelas dan proses yang simpel.</p>
        <div className="footer-links"><Link href="/stock">Katalog</Link><Link href="/testimoni">Testimoni</Link><a href={postingUrl} target="_blank" rel="noreferrer">Jasa Rekber / Midman ↗</a></div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} ASTRA MARKET</span><span>Independent fan store. Tidak berafiliasi dengan EA SPORTS atau FC Mobile.</span></div>
    </footer>
  );
}
