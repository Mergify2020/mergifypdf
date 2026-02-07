export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSignSession, updateSignSession } from "@/lib/signSessionStore";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

const MAX_DATA_URL_LENGTH = 250_000;
const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/i;

function extractIdFromPath(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/");
  return segments[segments.length - 1] || null;
}

function resolveSessionId(request: NextRequest, context: any): string | null {
  const ctxId = context?.params?.id as string | undefined;
  if (ctxId && typeof ctxId === "string") {
    return ctxId;
  }
  return extractIdFromPath(request);
}

export async function GET(request: NextRequest, context: any) {
  const sessionId = resolveSessionId(request, context);
  if (!sessionId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const session = await getSignSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: session.id,
    signatureDataUrl: session.signatureDataUrl ?? null,
    name: session.name ?? null,
    updatedAt: session.updatedAt,
  });
}

export async function PUT(request: NextRequest, context: any) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const limit = await rateLimit(request, { keyPrefix: "sign-session-put", windowMs: 60_000, max: 20 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const sessionId = resolveSessionId(request, context);
  if (!sessionId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.dataUrl !== "string") {
    return NextResponse.json({ error: "Missing dataUrl" }, { status: 400 });
  }
  const dataUrl = body.dataUrl.trim();
  if (!DATA_URL_RE.test(dataUrl)) {
    return NextResponse.json({ error: "Invalid dataUrl" }, { status: 400 });
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "Signature too large" }, { status: 413 });
  }
  const rawName = typeof body.name === "string" ? body.name.trim() : "";
  const name = rawName.length > 0 ? rawName.slice(0, 80) : undefined;
  const session = await updateSignSession(sessionId, { signatureDataUrl: dataUrl, name });
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
