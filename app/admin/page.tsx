import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/AdminDashboard";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard admin", robots: { index: false, follow: false, noarchive: true } };

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) redirect(`${process.env.ADMIN_DASHBOARD_PATH || "/admin"}/login`);
  return <AdminDashboard />;
}
