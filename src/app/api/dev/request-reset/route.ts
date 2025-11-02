// src/app/api/dev/request-reset/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { createResetTokenRow } from "@/lib/resetTokenWriter";
import { sendResetEmail } from "@/lib/email";

export async function GET(req: Request) {
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
      return NextResponse.json({ ok: false, email, steps, userFound: false });
    }
    steps.push("generate-token");

    const token = await generateToken(user.id);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    steps.push("create-token-row");

    const created = await createResetTokenRow({ token, userId: user.id, expiresAt });
    if (!created.ok) {
      return NextResponse.json({
        ok: false,
        email,
        steps,
        userFound: true,
        tokenLen: token.length,
        createRes: created,
      });
    }

    steps.push("send-email");
    const sent = await sendResetEmail({ to: user.email as string, token });

    return NextResponse.json({
      ok: true,
      email,
      steps,
      userFound: true,
      tokenLen: token.length,
      createRes: created,
      sent,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, email, steps, error: String(e) });
  }
}
