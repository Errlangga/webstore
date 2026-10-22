import { NextRequest, NextResponse } from "next/server";

function getAdminBasePath() {
  const value = (process.env.ADMIN_DASHBOARD_PATH || "").trim().replace(/\/+$/, "");
  return /^\/[a-z0-9-]{20,80}$/.test(value) ? value : "";
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const adminBasePath = getAdminBasePath();
  const isLegacyAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  // Production fails closed if the private route is not configured.
  if (isLegacyAdminPath && (adminBasePath || process.env.NODE_ENV === "production")) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  if (!adminBasePath) return NextResponse.next();

  if (pathname === adminBasePath || pathname.startsWith(adminBasePath + "/")) {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = "/admin" + pathname.slice(adminBasePath.length);
    return NextResponse.rewrite(rewritten, {
      headers: { "X-Robots-Tag": "noindex, nofollow, noarchive" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
