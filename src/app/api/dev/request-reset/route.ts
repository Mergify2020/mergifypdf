import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createFreshResetTokenForUser } from "@/lib/resetTokenWriter";
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
      return NextResponse.json({ ok: false, steps, email, userFound: false });
    }

    steps.push("create-token-row");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const created = await createFreshResetTokenForUser(user.id, expiresAt);
    if (!created.ok) {
      return NextResponse.json({ ok: false, steps, email, userFound: true, createRes: created });
    }

    steps.push("send-email");
    const sent = await sendResetEmail({ to: user.email as string, token: created.row.token });

    return NextResponse.json({
      ok: true,
      steps,
      email,
      userFound: true,
      tokenLen: created.row.token.length,
      createRes: created,
      sent,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, steps, email, error: String(e) });
  }
}
