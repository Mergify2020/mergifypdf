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

    // 1) Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      // You asked to explicitly say when it’s not registered.
      return NextResponse.json({
        ok: false,
        code: "NO_ACCOUNT",
        message: "We couldn’t find an account with that email.",
      });
    }

    // 2) Generate token string
    const token = await generateToken(user.id);

    // 3) Store token row (1-hour expiry)
    await prisma.resetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // 4) Send the email
    // Cast to string to satisfy TS if your Prisma model allows null
    await sendResetEmail({ to: user.email as string, token });

    return NextResponse.json({
      ok: true,
      code: "SENT",
      message: "Reset link sent. Please check your inbox; delivery can take a few minutes.",
    });
  } catch (e: any) {
    console.error("[request-reset] ERROR:", e);
    return NextResponse.json({
      ok: false,
      code: "ERROR",
      message:
        "We couldn’t process your request right now. Please try again in a moment.",
    });
  }
}
