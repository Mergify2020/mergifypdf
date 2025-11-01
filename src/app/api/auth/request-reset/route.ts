import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    }

    // Always return ok to avoid user enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = generateToken(); // your helper (e.g., crypto.randomUUID())
      await prisma.resetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
        },
      });

      // ✅ NEW signature: object param
      await sendResetEmail({ to: email, token });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("request-reset error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
