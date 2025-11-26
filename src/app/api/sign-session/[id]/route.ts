import { NextResponse } from "next/server";
import { getSignSession, updateSignSession } from "@/lib/signSessionStore";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = getSignSession(params.id);
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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.dataUrl !== "string") {
    return NextResponse.json({ error: "Missing dataUrl" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name : undefined;
  const session = updateSignSession(params.id, { signatureDataUrl: body.dataUrl, name });
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
