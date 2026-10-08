import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "cr_session";

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/residents") ||
    pathname.startsWith("/households") ||
    pathname.startsWith("/id-cards") ||
    pathname.startsWith("/duplicates") ||
    pathname.startsWith("/transfers") ||
    pathname.startsWith("/life-events") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/audit-logs") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/id-management") ||
    pathname.startsWith("/verification")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/residents/:path*",
    "/households/:path*",
    "/id-cards/:path*",
    "/duplicates/:path*",
    "/transfers/:path*",
    "/life-events/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/audit-logs/:path*",
    "/admin/:path*",
    "/id-management/:path*",
    "/verification/:path*",
  ],
};
