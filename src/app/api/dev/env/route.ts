// src/app/api/dev/env/route.ts (NEW FILE - paste entire file)
import { NextResponse } from "next/server";

export async function GET() {
  const base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";

  return NextResponse.json({
    ok: true,
    from: process.env.FROM_EMAIL || "MergifyPDF <onboarding@resend.dev>",
    RESEND_API_KEY_present: Boolean(process.env.RESEND_API_KEY),
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || null,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || null,
    VERCEL_URL: process.env.VERCEL_URL || null,
    resolved_base: base.replace(/\/+$/, ""),
  });
}
