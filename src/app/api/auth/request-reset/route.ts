// src/app/api/auth/request-reset/route.ts — FULL FILE WITH TEST BYPASS + THROTTLE
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

/**
 * Normal throttle window (2 minutes).
 * While TESTING you can send { "force": true } to bypass the throttle.
 */
const THROTTLE_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email: unknown = (body as any)?.email;
    const force: boolean = Boolean((body as any)?.force); // test bypass

    // Always return ok:true (don’t leak whether the user exists)
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: true });
    }

    // Look up user (still no user enumeration)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }, // email can be null in some schemas
    });

    // If no user (or null email), pretend success
    if (!user?.email) {
      return NextResponse.json({ ok: true });
    }

    // Throttle unless force=true (test bypass)
    if (!force) {
      const recent = await prisma.resetToken.findFirst({
        where: {
          userId: user.id,
          createdAt: { gt: new Date(Date.now() - THROTTLE_MS) },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (recent) {
        // Pretend success but don’t send again
        return NextResponse.json({ ok: true });
      }
    }

    // Create a fresh token and persist it
    const token = await generateToken(user.id);

    await prisma.resetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send the email through Resend
    await sendResetEmail({ to: user.email, token });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[request-reset] error:", e);
    // Still generic to avoid user enumeration
    return NextResponse.json({ ok: true });
  }
}
