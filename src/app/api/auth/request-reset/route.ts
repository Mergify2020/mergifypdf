import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";
import { createResetTokenFlexible } from "@/lib/resetTokenWriter";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: true });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user?.id) {
      // Generic success to avoid user enumeration
      return NextResponse.json({ ok: true });
    }

    const token = await generateToken(user.id);

    const createRes = await createResetTokenFlexible(
      user.id,
      user.email as string,
      token
    );

    if (!createRes.ok) {
      console.error("[request-reset] create reset row failed:", createRes);
      return NextResponse.json({ ok: true });
    }

    const sendRes = await sendResetEmail({ to: user.email as string, token });
    if (!sendRes.ok) {
      console.error("[request-reset] email send failed:", sendRes);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[request-reset] error:", e);
    return NextResponse.json({ ok: true });
  }
}
