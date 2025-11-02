// src/app/api/auth/request-reset/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";
import { createResetTokenRow } from "@/lib/resetTokenWriter";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Always generic response to avoid user enumeration
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: true });
    }

    // Find user (don’t leak existence)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    // Generate unique token (string)
    const token = await generateToken(user.id);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Try to insert token row (retry built-in)
    const insert = await createResetTokenRow({ token, userId: user.id, expiresAt });
    if (!insert.ok) {
      // Still return ok:true (no info leak), but log for yourself
      console.error("[request-reset] insert failed:", insert.error);
      return NextResponse.json({ ok: true });
    }

    // Send email (user.email is typed as string | null in DB — cast since we checked)
    await sendResetEmail({ to: user.email as string, token });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[request-reset] fatal:", e);
    return NextResponse.json({ ok: true });
  }
}
