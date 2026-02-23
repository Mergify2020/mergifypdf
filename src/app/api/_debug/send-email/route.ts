import { NextResponse } from "next/server";
import { guardDevRoute } from "@/lib/devRouteGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;
  return NextResponse.json({ ok: true, msg: "debug endpoint reachable" });
}
