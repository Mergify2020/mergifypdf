import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

// throttle window in seconds (same email)
const THROTTLE_SECONDS = 60;

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ ok: true }); // no enumeration

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // If a token already exists recently for this user, don't issue another immediately
      const recent = await prisma.resetToken.findFirst({
        where: {
          userId: user.id,
          createdAt: {
            gte: new Date(Date.now() - THROTTLE_SECONDS * 1000),
          },
        },
        select: { id: true },
      });

      if (!recent) {
        const token = await generateToken(user.id);
        // fire-and-forget
        sendResetEmail({ to: email, token }).catch((e) =>
          console.error("Reset email error:", e)
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Request-reset error:", e);
    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 });
  }
}
