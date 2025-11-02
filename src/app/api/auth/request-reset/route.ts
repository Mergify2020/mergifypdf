// src/app/api/auth/request-reset/route.ts — NO THROTTLE
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Always return generic success to avoid enumeration
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: true });
    }

    // Find user; still return ok:true if not found
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) return NextResponse.json({ ok: true });

    // Generate a fresh token string
    const token = await generateToken(user.id);

    // Store token row (adjust fields if your schema differs)
    await prisma.resetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send the email
    await sendResetEmail({ to: user.email, token });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[request-reset] error:", e);
    return NextResponse.json({ ok: true });
  }
}
