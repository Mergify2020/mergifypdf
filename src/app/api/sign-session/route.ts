import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { createSignSession } from "@/lib/signSessionStore";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const limit = await rateLimit(req, { keyPrefix: "sign-session", windowMs: 60_000, max: 10 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const session = await createSignSession();
  return NextResponse.json({ id: session.id });
}
