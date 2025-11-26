import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { createSignSession } from "@/lib/signSessionStore";

export async function POST() {
  const session = await createSignSession();
  return NextResponse.json({ id: session.id });
}
