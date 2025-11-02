// src/app/api/dev/request-reset/route.ts  — REPLACE EVERYTHING
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Node crypto is available in Next.js Route Handlers (node runtime)
import { randomUUID, randomBytes } from "crypto";

// Small helper to create a strong random token
function makeToken() {
  // 36-char uuid + 64-char hex = 100 chars total. Plenty of entropy.
  return `${randomUUID()}-${randomBytes(32).toString("hex")}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email") || "morrisalan2020@gmail.com";

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "no-user" });
    }

    // 🔁 Clean up old tokens for this user to avoid unique collisions on `token`
    await prisma.resetToken.deleteMany({ where: { userId: user.id } });

    // 🎟️ Create a fresh token
    const token = makeToken();

    // ⏰ 1 hour expiry (adjust to match your schema)
    const created = await prisma.resetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ ok: true, token: created.token, expiresAt: created.expiresAt });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
