"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { whatsappUrl } from "@/lib/format";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/stock", label: "Katalog akun" },
  { href: "/testimoni", label: "Testimoni" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [adminWhatsapp, setAdminWhatsapp] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/store-settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && typeof data?.whatsapp_number === "string") setAdminWhatsapp(data.whatsapp_number);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const postingUrl = whatsappUrl(
    "Halo admin Astra Market FC Mobile, saya ingin menggunakan jasa posting. Boleh minta informasi syarat dan biayanya?",
    adminWhatsapp,
  );
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link href="/" className="brand" aria-label="Astra Market FC Mobile beranda">
          <img className="brand-logo" src="/astra-market-logo.svg" alt="Astra Market FC Mobile" width="280" height="58" />
        </Link>
        <nav className="main-nav" aria-label="Navigasi utama">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href + "/")) ? "nav-link active" : "nav-link"}>
              {link.label}
            </Link>
          ))}
          <a className="nav-link service-nav-link" href={postingUrl} target="_blank" rel="noreferrer">Jasa Posting <span aria-hidden="true">↗</span></a>
        </nav>
        <Link className="nav-cta" href="/stock">Cari akun <span aria-hidden="true">↗</span></Link>
      </div>
    </header>
  );
}
