export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { consumeOwnedSignSession, getOwnedSignSession } from "@/lib/signSessionStore";
import { isSameOrigin } from "@/lib/requestGuards";

type RouteContext = { params: Promise<{ id?: string }> };

function extractIdFromPath(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/");
  return segments[segments.length - 1] || null;
}

async function resolveSessionId(request: NextRequest, context: RouteContext): Promise<string | null> {
  const params = await context.params;
  const ctxId = params?.id;
  if (ctxId && typeof ctxId === "string") {
    return ctxId;
  }
  return extractIdFromPath(request);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionId = await resolveSessionId(request, context);
  if (!sessionId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const session = await getOwnedSignSession(sessionId, authSession.user.id);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    {
      id: session.id,
      signatureDataUrl: session.signatureDataUrl ?? null,
      name: session.name ?? null,
      status: session.status,
      updatedAt: session.updatedAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionId = await resolveSessionId(request, context);
  if (!sessionId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const consumed = await consumeOwnedSignSession(sessionId, authSession.user.id);
  if (!consumed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
