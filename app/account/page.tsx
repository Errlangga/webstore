import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountAccessForm from "@/components/AccountAccessForm";
import { getMarketUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Akun member",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  if (await getMarketUser()) redirect("/");
  const params = await searchParams;
  return <AccountAccessForm initialMode={params.mode === "login" ? "login" : "register"} />;
}
