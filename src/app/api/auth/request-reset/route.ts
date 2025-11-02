// src/app/api/auth/request-reset/route.ts  — REPLACE EVERYTHING
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

/**
 * Simple throttle:
 * - If this user has requested a reset within the last 2 minutes,
 *   we silently return ok:true without sending a new email.
 */
const THROTTLE_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (typeof email !== "string" || !email.includes("@")) {
      // Always a generic response (no user enumeration)
      return NextResponse.json({ ok: true });
    }

    // Look up user (still return ok:true if not found)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      // Do not reveal whether the email exists
      return NextResponse.json({ ok: true });
    }

    // Has this user requested recently?
    const recent = await prisma.resetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - THROTTLE_MS) },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (recent) {
      // Throttled — pretend success, but don’t send again
      return NextResponse.json({ ok: true });
    }

    // Generate a new token string (helper just returns a string)
    const token = await generateToken(user.id);

    // Store token row (adjust fields if your schema differs)
    await prisma.resetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Build/send the email
    await sendResetEmail({ to: user.email, token });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[request-reset] error:", e);
    // Still generic to avoid user enumeration
    return NextResponse.json({ ok: true });
  }
}
