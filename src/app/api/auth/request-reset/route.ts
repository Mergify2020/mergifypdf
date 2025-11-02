// TEMP DEBUG + HARDENED INSERT
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  const debug: any = { steps: [] };

  try {
    const { email } = await req.json();
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({
        ok: false,
        code: "BAD_EMAIL",
        message: "Please enter a valid email address.",
      });
    }

    debug.steps.push("lookup-user");
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({
        ok: false,
        code: "NO_ACCOUNT",
        message: "We couldn’t find an account with that email.",
      });
    }

    // Generate & insert with small retry loop to avoid rare collisions / DB quirks
    debug.steps.push("generate-token");
    let token: string | null = null;
    let created = false;
    let lastErr: any = null;

    for (let i = 0; i < 3 && !created; i++) {
      token = await generateToken(user.id);
      debug[`try_${i + 1}`] = { tokenLen: token.length };

      try {
        debug.steps.push("create-token-row");
        await prisma.resetToken.create({
          data: {
            token,
            userId: user.id,
            // include explicit timestamps in case DB defaults are missing
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          },
        });
        created = true;
      } catch (e: any) {
        lastErr = {
          name: e?.name,
          code: e?.code,
          meta: e?.meta,
          message: e?.message,
        };
        // P2002 = unique constraint violation in Prisma; regenerate and try again
        if (e?.code !== "P2002") break;
      }
    }

    if (!created) {
      return NextResponse.json({
        ok: false,
        code: "DB_CREATE_FAILED",
        message: "We couldn’t save the reset token.",
        debug, // TEMPORARY: helps us see the real cause
        error: lastErr,
      });
    }

    debug.steps.push("send-email");
    await sendResetEmail({ to: user.email as string, token: token! });

    return NextResponse.json({
      ok: true,
      code: "SENT",
      message:
        "Reset link sent. Please check your inbox; delivery can take a few minutes.",
    });
  } catch (e: any) {
    // TEMP: surface error details to unblock us
    return NextResponse.json({
      ok: false,
      code: "ERROR",
      message:
        "We couldn’t process your request right now. Please try again in a moment.",
      error: { name: e?.name, code: e?.code, meta: e?.meta, message: e?.message },
      debug,
    });
  }
}
