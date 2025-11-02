// src/app/api/auth/request-reset/route.ts — FULL NO-THROTTLE VERSION
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

/**
 * Always send reset email instantly — no throttle window.
 * Returns ok:true even if user not found (for security).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email: unknown = (body as any)?.email;

    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: true });
    }

    // Find user silently
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user?.email) {
      // Still pretend success to avoid user enumeration
      return NextResponse.json({ ok: true });
    }

    // Always make a new token (no throttling)
    const token = await generateToken(user.id);

    await prisma.resetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // expires in 1 hr
      },
    });

    // Send email instantly
    await sendResetEmail({ to: user.email, token });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[request-reset] error:", e);
    return NextResponse.json({ ok: true });
  }
}
