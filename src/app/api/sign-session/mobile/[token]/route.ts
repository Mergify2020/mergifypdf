export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileSignSession, submitMobileSignature } from "@/lib/signSessionStore";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

const MAX_DATA_URL_LENGTH = 250_000;
const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i;
type RouteContext = { params: Promise<{ token?: string }> };

async function getToken(context: RouteContext) {
  const { token } = await context.params;
  return typeof token === "string" && token.length >= 32 ? token : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const token = await getToken(context);
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await getMobileSignSession(token);
  if (!session || session.status !== "pending") {
    return NextResponse.json({ error: "This signing request is closed" }, { status: 404 });
  }
  return NextResponse.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const limit = await rateLimit(request, { keyPrefix: "mobile-sign-session-submit", windowMs: 60_000, max: 10 });
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const token = await getToken(context);
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.dataUrl !== "string") return NextResponse.json({ error: "Missing dataUrl" }, { status: 400 });
  const dataUrl = body.dataUrl.trim();
  if (!DATA_URL_RE.test(dataUrl)) return NextResponse.json({ error: "Invalid dataUrl" }, { status: 400 });
  if (dataUrl.length > MAX_DATA_URL_LENGTH) return NextResponse.json({ error: "Signature too large" }, { status: 413 });
  const rawName = typeof body.name === "string" ? body.name.trim() : "";
  const result = await submitMobileSignature({ signingToken: token, dataUrl, name: rawName.slice(0, 80) || undefined });
  if (result === "accepted") return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  if (result === "closed") return NextResponse.json({ error: "Signature already submitted" }, { status: 409 });
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
