export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardDevRoute } from "@/lib/devRouteGuard";

export async function GET(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ ok: true, users: count });
  } catch (error) {
    console.error("[db-check]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
