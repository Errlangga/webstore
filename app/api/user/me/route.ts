import { NextResponse } from "next/server";
import { getMarketUser } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getMarketUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ user: { id: user.id, username: user.username, created_at: user.created_at } }, { headers: { "Cache-Control": "no-store" } });
}
