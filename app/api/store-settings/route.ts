import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getStoreSettings();
  return NextResponse.json(
    {
      whatsapp_number: settings.whatsapp_number,
      hero_card_image_1: settings.hero_card_image_1,
      hero_card_image_2: settings.hero_card_image_2,
      fc_mobile_logo_image: settings.fc_mobile_logo_image,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
