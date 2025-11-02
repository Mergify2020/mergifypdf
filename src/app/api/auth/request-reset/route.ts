// src/app/api/auth/request-reset/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({
        ok: false,
        code: "BAD_EMAIL",
        message: "Please enter a valid email address.",
      });
    }

    // 1) Look up user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      // You asked to show “email not found”
      return NextResponse.json({
        ok: false,
        code: "NOT_FOUND",
        message: "Email not found. Please check and try again.",
      });
    }

    // 2) Create token row (no throttle)
    const token = await generateToken(user.id);
    await prisma.resetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // 3) Send email
    await sendResetEmail({ to: user.email!, token });

    return NextResponse.json({
      ok: true,
      code: "SENT",
      message:
        "Reset link sent. Please check your inbox — it can take a few minutes.",
    });
  } catch (e) {
    console.error("[request-reset] error:", e);
    return NextResponse.json({
      ok: false,
      code: "ERROR",
      message:
        "We couldn’t process the reset right now. Please try again in a moment.",
    });
  }
}
