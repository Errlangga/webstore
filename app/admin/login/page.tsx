import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/AdminLoginForm";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false, noarchive: true } };

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect(process.env.ADMIN_DASHBOARD_PATH || "/admin");
  return <AdminLoginForm />;
}
