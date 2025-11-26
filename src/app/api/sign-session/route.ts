import { NextResponse } from "next/server";
import { createSignSession } from "@/lib/signSessionStore";

export async function POST() {
  const session = createSignSession();
  return NextResponse.json({ id: session.id });
}
