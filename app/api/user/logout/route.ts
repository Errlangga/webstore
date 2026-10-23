import { NextResponse } from "next/server";
import {
  bindMarketDevice,
  createMarketDeviceToken,
  getMarketDeviceToken,
  getMarketUser,
  hashMarketDeviceToken,
  marketDeviceCookieMaxAge,
  marketDeviceCookieName,
  marketUserCookieName,
} from "@/lib/user-auth";

export const runtime = "nodejs";

export async function POST() {
  const user = await getMarketUser();
  let deviceToken = await getMarketDeviceToken();

  // Bind current legacy sessions before removing the short-lived login cookie.
  if (user && process.env.DATABASE_URL) {
    deviceToken ||= createMarketDeviceToken();
    try {
      await bindMarketDevice(hashMarketDeviceToken(deviceToken), user.id);
    } catch (error) {
      console.error("Member device binding on logout failed:", error);
    }
  }

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(marketUserCookieName(), "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0,
  });
  // The device cookie deliberately remains after logout to prevent re-registration.
  if (deviceToken) {
    response.cookies.set(marketDeviceCookieName(), deviceToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: marketDeviceCookieMaxAge(),
    });
  }
  return response;
}
