import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendResetEmail } from "@/lib/email";
import { generateSixDigitCode, hashVerificationCode } from "@/lib/verificationCode";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const email = url.searchParams.get("email") || "";
  const steps: string[] = [];

  try {
    steps.push("lookup-user");
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, steps, email, userFound: false });
    }

    steps.push("create-code-row");
    const code = generateSixDigitCode();
    const token = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.resetToken.deleteMany({ where: { userId: user.id } });
    const created = await prisma.resetToken.create({
      data: { token, userId: user.id, expiresAt },
      select: { id: true, token: true, userId: true, createdAt: true, expiresAt: true },
    });

    steps.push("send-email");
    const sent = await sendResetEmail({ to: user.email as string, code });

    return NextResponse.json({
      ok: true,
      steps,
      email,
      userFound: true,
      tokenLen: created.token.length,
      createRes: created,
      sent,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, steps, email, error: String(e) });
  }
}
