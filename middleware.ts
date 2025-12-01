import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isTwoFactorPage = pathname === "/two-factor";
  const isNextAuthApi = pathname.startsWith("/api/auth");

  // Always allow NextAuth internals (including 2FA APIs) to run
  if (isNextAuthApi) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;
  const token = (secret ? await getToken({ req, secret }) : null) as JWT | null;

  if (!token) {
    if (isTwoFactorPage) {
      const url = new URL("/login", req.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const twoFactorEnabled = !!token?.twoFactorEnabled;
  const twoFactorVerified =
    typeof token?.twoFactorVerified === "boolean"
      ? token.twoFactorVerified
      : !twoFactorEnabled;

  if (twoFactorEnabled && !twoFactorVerified && !isTwoFactorPage) {
    const url = new URL("/two-factor", req.url);
    const callback = pathname + search;
    url.searchParams.set("callbackUrl", callback);
    return NextResponse.redirect(url);
  }

  if (isTwoFactorPage && (!twoFactorEnabled || twoFactorVerified)) {
    const callback = req.nextUrl.searchParams.get("callbackUrl") || "/";
    const url = new URL(callback, req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
