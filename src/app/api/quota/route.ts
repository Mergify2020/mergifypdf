// src/app/api/quota/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE = "mpdf_free_used"; // stores YYYY-MM-DD when free used

function today() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function hasUsedToday() {
  const c = await cookies();
  return c.get(COOKIE)?.value === today();
}

async function markUsedToday() {
  const c = await cookies();
  c.set({
    name: COOKIE,
    value: today(),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 3,
  });
}

export async function POST() {
  if (await hasUsedToday()) {
    return NextResponse.json({ ok: false, reason: "limit_reached" }, { status: 403 });
  }
  await markUsedToday();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ usedToday: await hasUsedToday() });
}
