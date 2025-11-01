// src/app/api/auth/password/reset-request/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string")
      return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });

    // Respond 200 even if user not found (don’t leak which emails exist)
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    // Kill any existing tokens for this user
    await prisma.resetToken.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    await prisma.resetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const sent = await sendPasswordResetEmail(email, token);
    if (!sent.ok) {
      // Log for server, generic message for client
      console.error("Email send failed:", sent.error);
      return NextResponse.json({ ok: false, error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("reset-request error:", err?.message || err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
