import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MyCatalogDashboard from "@/components/MyCatalogDashboard";
import { getMarketUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My Katalog",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function MyCatalogPage() {
  const user = await getMarketUser();
  if (!user) redirect("/account?mode=login&next=%2Fmy-katalog");
  return <MyCatalogDashboard username={user.username} />;
}
