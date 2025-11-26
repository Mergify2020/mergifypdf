export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSignSession, updateSignSession } from "@/lib/signSessionStore";

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
  const sessionId = resolveSessionId(request, context);
  if (!sessionId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.dataUrl !== "string") {
    return NextResponse.json({ error: "Missing dataUrl" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name : undefined;
  const session = await updateSignSession(sessionId, { signatureDataUrl: body.dataUrl, name });
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
