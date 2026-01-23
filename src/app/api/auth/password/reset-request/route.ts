import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendResetEmail } from "@/lib/email";
import { generateSixDigitCode, hashVerificationCode } from "@/lib/verificationCode";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const user = await prisma.user.findUnique({ where: { email } });

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
      await sendResetEmail({ to: email, code });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 });
  }
}
