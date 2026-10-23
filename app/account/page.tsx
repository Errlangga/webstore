import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountAccessForm from "@/components/AccountAccessForm";
import { getMarketUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Akun member",
  robots: { index: false, follow: false, noarchive: true },
};

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || value.includes("\\")) return "/";
  if (value.startsWith("/account") || value.startsWith("/api/")) return "/";
  return value;
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  if (await getMarketUser()) redirect(nextPath);
  return <AccountAccessForm initialMode={params.mode === "login" ? "login" : "register"} nextPath={nextPath} />;
}
