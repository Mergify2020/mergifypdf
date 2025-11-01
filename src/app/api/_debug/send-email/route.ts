// src/app/api/_debug/send-email/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, msg: "debug endpoint reachable" });
}
