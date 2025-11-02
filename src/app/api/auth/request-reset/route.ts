import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

// tries several common shapes for ResetToken
async function createResetRow(userId: string, email: string, token: string) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  // Attempt 1
  try {
    await (prisma as any).resetToken.create({
      data: { token, userId, expiresAt },
    });
    return { ok: true, used: "userId" };
  } catch {}

  // Attempt 2
  try {
    await (prisma as any).resetToken.create({
      data: { token, user: { connect: { id: userId } }, expiresAt },
    });
    return { ok: true, used: "user.connect.id" };
  } catch {}

  // Attempt 3
  try {
    await (prisma as any).resetToken.create({
      data: { token, email, expiresAt },
    });
    return { ok: true, used: "email" };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

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

    // robust create for various schemas
    const createRes = await createResetRow(user.id, user.email as string, token);
    if (!createRes.ok) {
      // Still generic OK to the client, but log the reason
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
