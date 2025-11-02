// src/app/api/auth/request-reset/route.ts — FULL FILE
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

/**
 * Throttle reset requests per user to avoid spam.
 * Change this if you want a different window.
 */
const THROTTLE_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email: unknown = body?.email;

    // Always return ok:true (no user enumeration)
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: true });
    }

    // Find the user but do not leak existence
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user || !user.email) {
      // If not found or email nullable in schema, still return ok
      return NextResponse.json({ ok: true });
    }

    // Throttle: has a token been created recently for this user?
    const recent = await prisma.resetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - THROTTLE_MS) },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (recent) {
      // Pretend success but don't send a new email
      return NextResponse.json({ ok: true });
    }

    // Create a fresh token string and persist it
    const token = await generateToken(user.id);

    await prisma.resetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send email (now guaranteed string)
    await sendResetEmail({ to: user.email, token });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[request-reset] error:", e);
    // Still generic to avoid user enumeration
    return NextResponse.json({ ok: true });
  }
}
