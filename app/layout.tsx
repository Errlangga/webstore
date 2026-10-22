import type { Metadata } from "next";
import "./globals.css";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: { default: "OVR MARKET — FC Mobile Store", template: "%s | OVR MARKET" },
  description: "Temukan akun FC Mobile pilihanmu. Katalog transparan, detail lengkap, dan transaksi langsung dengan admin.",
  applicationName: "OVR MARKET",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <SiteNav />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
