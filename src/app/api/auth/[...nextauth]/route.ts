import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import { getAppSafetyStatus, isAppSafetyBlocking } from "@/lib/appSafety";

const handler = NextAuth(authOptions);
type AuthRouteContext = {
  params: Promise<{ nextauth: string[] }>;
};

function buildBlockedAuthResponse(req: Request) {
  const url = new URL(req.url);
  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("error", "SERVICE_UNAVAILABLE");

  const expectsJson =
    url.searchParams.get("json") === "true"
    || req.headers.get("content-type")?.includes("application/x-www-form-urlencoded");

  if (expectsJson) {
    return NextResponse.json({ url: loginUrl.toString() }, { status: 503 });
  }

  return NextResponse.redirect(loginUrl, { status: 302 });
}

async function shouldBlockAuthRoute(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (path.endsWith("/providers") || path.endsWith("/csrf")) {
    return false;
  }

  const status = await getAppSafetyStatus();
  return isAppSafetyBlocking(status);
}

export async function GET(req: NextRequest, context: AuthRouteContext) {
  if (await shouldBlockAuthRoute(req)) {
    return buildBlockedAuthResponse(req);
  }

  return handler(req, context);
}

export async function POST(req: NextRequest, context: AuthRouteContext) {
  if (await shouldBlockAuthRoute(req)) {
    return buildBlockedAuthResponse(req);
  }

  return handler(req, context);
}
