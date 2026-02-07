import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendResetEmail } from "@/lib/email";
import { generateSixDigitCode, hashVerificationCode } from "@/lib/verificationCode";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
    }
    const limit = await rateLimit(req, { keyPrefix: "reset-request-legacy", windowMs: 60_000, max: 5 });
    if (!limit.ok) {
      return NextResponse.json({
        ok: true,
        message: "If an account exists for that email, a reset code has been sent.",
      });
    }

    const { email } = await req.json();
    const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
    const user = normalized
      ? await prisma.user.findUnique({ where: { email: normalized } })
      : null;

    if (user) {
      const code = generateSixDigitCode();
      const token = hashVerificationCode(code);
      await prisma.resetToken.deleteMany({ where: { userId: user.id } });
      await prisma.resetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      await sendResetEmail({ to: normalized, code });
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, a reset code has been sent.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, a reset code has been sent.",
    });
  }
}
