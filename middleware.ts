import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

function applySecurityHeaders(res: NextResponse) {
  const r2AccountId = process.env.R2_ACCOUNT_ID?.trim();
  const secureUploadOrigin =
    process.env.STORAGE_MODEL_V2_ENABLED === "true" &&
    r2AccountId &&
    /^[a-z0-9]{16,64}$/i.test(r2AccountId)
      ? " https://" + r2AccountId + ".r2.cloudflarestorage.com"
      : "";
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' https://js.stripe.com",
    "connect-src 'self' https://api.stripe.com" + secureUploadOrigin,
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  const isStaticAsset =
    pathname.startsWith("/_next/") || pathname === "/favicon.ico" || /\.[^/]+$/.test(pathname);
  if (isStaticAsset) {
    return applySecurityHeaders(NextResponse.next());
  }

  const isTwoFactorPage = pathname === "/two-factor" || pathname === "/2fa";
  const isNextAuthApi = pathname.startsWith("/api/auth");

  // Always allow NextAuth internals (including 2FA APIs) to run
  if (isNextAuthApi) {
    return applySecurityHeaders(NextResponse.next());
  }

  if (process.env.NODE_ENV !== "production") {
    return applySecurityHeaders(NextResponse.next());
  }

  const secret = process.env.NEXTAUTH_SECRET;
  const token = (secret ? await getToken({ req, secret }) : null) as JWT | null;

  const landing = searchParams.get("landing");

  const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/reset-password"];
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isProtectedPath =
    !isPublicPath && !isTwoFactorPage && !isNextAuthApi && !pathname.startsWith("/api/");

  if (!token) {
    if (isTwoFactorPage) {
      const url = new URL("/login", req.url);
      return applySecurityHeaders(NextResponse.redirect(url));
    }
    if (isProtectedPath) {
      const url = new URL("/login", req.url);
      return applySecurityHeaders(NextResponse.redirect(url));
    }
    return applySecurityHeaders(NextResponse.next());
  }

  const twoFactorEnabled = !!token.twoFactorEnabled || token.twoFactorMethod === "email";
  const twoFactorPassed = token.twoFactorPassed === true;

  if (twoFactorEnabled === true && twoFactorPassed !== true) {
    const isTwoFactorRoute =
      pathname.startsWith("/2fa") || pathname.startsWith("/two-factor");
    const isHeroLanding = pathname === "/" && landing === "hero";

    if (!isTwoFactorRoute && !isHeroLanding) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/2fa", req.url)));
    }
  }

  // If user is already fully verified (or 2FA disabled), allow access / fall through,
  // including letting them leave the /2fa page.
  if (isTwoFactorPage && (!twoFactorEnabled || twoFactorPassed)) {
    const callback = req.nextUrl.searchParams.get("callbackUrl") || "/";
    const url = new URL(callback, req.url);
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
