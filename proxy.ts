import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, isValidToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (isValidToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // `icons/` must stay open: the installed PWA has its own cookie jar, so iOS
  // builds the launch screen from the manifest + a raster icon *before* login.
  // Gated, those fetches 307 to /login and serve HTML instead of a PNG.
  matcher: [
    "/((?!login|api/intake|manifest\\.webmanifest|_next/static|_next/image|favicon\\.ico|icons/).*)",
  ],
};
