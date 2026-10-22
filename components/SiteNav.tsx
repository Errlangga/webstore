"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/stock", label: "Katalog akun" },
  { href: "/testimoni", label: "Testimoni" },
];

export default function SiteNav() {
  const pathname = usePathname();
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
        </nav>
        <Link className="nav-cta" href="/stock">Cari akun <span aria-hidden="true">↗</span></Link>
      </div>
    </header>
  );
}
