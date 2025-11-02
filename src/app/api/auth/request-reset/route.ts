import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendResetEmail } from "@/lib/email";
import { createFreshResetTokenForUser } from "@/lib/resetTokenWriter";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Always generic response to avoid enumeration
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: true });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const created = await createFreshResetTokenForUser(user.id, expiresAt);
    if (!created.ok) {
      console.error("[request-reset] insert failed:", created.error);
      return NextResponse.json({ ok: true }); // stay generic
    }

    await sendResetEmail({ to: user.email as string, token: created.row.token });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[request-reset] fatal:", e);
    return NextResponse.json({ ok: true });
  }
}
