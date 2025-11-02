// src/app/api/dev/request-reset/route.ts  (NEW FILE - paste entire file)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ ok: false, error: "missing ?email=" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "user-not-found" }, { status: 200 });
    }

    // create token row (same logic as real route)
    const token = await generateToken(user.id);

    const created = await prisma.resetToken.create({
      data: {
        token,
        userId: user.id,
        // 1-hour expiry: adjust if your schema differs
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // send the email using the same helper the real route uses
    const sent = await sendResetEmail({ to: email, token });

    return NextResponse.json({
      ok: true,
      userId: user.id,
      tokenId: created.id ?? null,
      sent,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 200 });
  }
}
