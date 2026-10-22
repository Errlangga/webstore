import type { Metadata } from "next";
import "./globals.css";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export const metadata: Metadata = {
  title: { default: "Astra Market FC Mobile", template: "%s | Astra Market FC Mobile" },
  description: "Temukan akun FC Mobile pilihanmu. Katalog transparan, detail lengkap, dan transaksi langsung dengan admin.",
  applicationName: "Astra Market FC Mobile",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <SiteNav />
        <main>{children}</main>
        <SiteFooter />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
