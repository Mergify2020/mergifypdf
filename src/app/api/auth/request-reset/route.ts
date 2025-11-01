import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ ok: true });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok: true });

    // Remove any existing tokens for this user
    await prisma.resetToken.deleteMany({ where: { userId: user.id } });

    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await prisma.resetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    await sendResetEmail(email, token);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: true });
  }
}
