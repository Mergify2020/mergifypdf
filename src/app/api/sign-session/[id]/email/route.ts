import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { sendMobileSigningLinkEmail } from "@/lib/email";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";
import { getSignSession } from "@/lib/signSessionStore";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id?: string }> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const limit = await rateLimit(request, {
    keyPrefix: "sign-session-email",
    windowMs: 60_000,
    max: 5,
  });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many email requests. Please try again shortly." }, { status: 429 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing signing session." }, { status: 400 });
  }

  const session = await getSignSession(id);
  if (!session || session.signatureDataUrl) {
    return NextResponse.json({ error: "This signing link is no longer available." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const to = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(to) || to.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const signingUrl = new URL("/sign-on-mobile/" + id, request.nextUrl.origin).toString();
  const result = await sendMobileSigningLinkEmail({ to, signingUrl });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
