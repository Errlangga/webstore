import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getStoreSettings();
  return NextResponse.json(
    { whatsapp_number: settings.whatsapp_number },
    { headers: { "Cache-Control": "no-store" } },
  );
}
