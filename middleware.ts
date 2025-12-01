import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // STEP 1: verify middleware is actually running
  // This will appear in the server logs for every matched request.
  console.log("MIDDLEWARE RUNNING:", pathname);

  const isTwoFactorPage = pathname === "/two-factor" || pathname === "/2fa";
  const isNextAuthApi = pathname.startsWith("/api/auth");

  // Always allow NextAuth internals (including 2FA APIs) to run
  if (isNextAuthApi) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;
  const token = (secret ? await getToken({ req, secret }) : null) as JWT | null;

  const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/reset-password"];
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isProtectedPath =
    !isPublicPath && !isTwoFactorPage && !isNextAuthApi && !pathname.startsWith("/api/");

  if (!token) {
    if (isTwoFactorPage) {
      const url = new URL("/login", req.url);
      return NextResponse.redirect(url);
    }
    if (isProtectedPath) {
      const url = new URL("/login", req.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const twoFactorEnabled = !!token.twoFactorEnabled || token.twoFactorMethod === "email";
  const twoFactorPassed = token.twoFactorPassed === true;

  // STEP 2: log the "session" state derived from the JWT
  console.log("SESSION STATE:", {
    isAuthenticated: true,
    token,
    twoFactorEnabled,
    twoFactorPassed,
    pathname,
  });

  // STEP 3: enforce 2FA for any authenticated user with 2FA enabled
  if (
    twoFactorEnabled === true &&
    twoFactorPassed !== true &&
    !pathname.startsWith("/2fa") &&
    !pathname.startsWith("/two-factor")
  ) {
    console.log("REDIRECTING TO 2FA");
    return NextResponse.redirect(new URL("/2fa", req.url));
  }

  // If user is already fully verified (or 2FA disabled), allow access / fall through,
  // including letting them leave the /2fa page.
  if (isTwoFactorPage && (!twoFactorEnabled || twoFactorPassed)) {
    const callback = req.nextUrl.searchParams.get("callbackUrl") || "/";
    const url = new URL(callback, req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
