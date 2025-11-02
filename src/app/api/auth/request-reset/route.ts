// src/app/api/auth/request-reset/route.ts — REPLACE EVERYTHING
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendResetEmail } from "@/lib/email";
import { randomUUID, randomBytes } from "crypto";

// Strong random token (uuid + 32 bytes hex → ~100 chars)
function makeToken() {
  return `${randomUUID()}-${randomBytes(32).toString("hex")}`;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Always respond 200 to avoid user enumeration
    if (!email) {
      return NextResponse.json({ ok: true });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // Remove any prior tokens for this user to avoid @unique collisions
      await prisma.resetToken.deleteMany({ where: { userId: user.id } });

      const token = makeToken();

      await prisma.resetToken.create({
        data: {
          token,
          userId: user.id,
          // 1-hour expiry; adjust if your schema differs
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Send the email with your React template
      const send = await sendResetEmail({ to: email, token });

      // Optional: log send result server-side for debugging
      if (!send?.ok) {
        console.error("[request-reset] send failed:", send?.error);
      }
    }

    // Always return ok:true
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[request-reset] unexpected error:", e);
    // Still avoid leaking info to client
    return NextResponse.json({ ok: true });
  }
}
