// src/app/api/auth/request-reset/route.ts — REPLACE EVERYTHING
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";
import { randomUUID } from "crypto";

// how many times to retry if "token" hits the unique constraint
const MAX_TOKEN_RETRIES = 3;

type Json = Record<string, any>;
function ok(json: Json) {
  return NextResponse.json({ ok: true, ...json });
}
function err(code: string, message: string, extra?: Json) {
  return NextResponse.json({ ok: false, code, message, ...(extra ?? {}) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body?.email;
    if (!email || !email.includes("@")) {
      // invalid payload
      return err("BAD_REQUEST", "Please provide a valid email address.");
    }

    // 1) find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      // You asked to show this explicitly
      return err("EMAIL_NOT_FOUND", "Email not registered. Please check the address or sign up.");
    }

    // 2) generate a token (string)
    let token: string = await generateToken(user.id);

    // 3) write row to public.ResetToken with required columns
    //    (id, token, userId, expiresAt, createdAt, updatedAt)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const now = new Date();

    let created = null;
    for (let attempt = 1; attempt <= MAX_TOKEN_RETRIES; attempt++) {
      try {
        created = await prisma.resetToken.create({
          data: {
            id: randomUUID(), // table requires an id (no default)
            token,
            userId: user.id,
            expiresAt,
            createdAt: now,   // even though the column has CURRENT_TIMESTAMP default, we supply it to be explicit
            updatedAt: now,
          },
        });
        break; // success
      } catch (e: any) {
        // If unique constraint on token fires, generate a new token and retry
        const isUnique =
          e?.code === "P2002" || String(e?.message ?? "").toLowerCase().includes("unique");
        if (isUnique && attempt < MAX_TOKEN_RETRIES) {
          token = await generateToken(user.id);
          continue;
        }
        // any other error (or retries exhausted)
        return err("DB_CREATE_FAILED", "We couldn’t save the reset token.", {
          debug: { attempt, reason: e?.message ?? String(e) },
        });
      }
    }

    // 4) send the email
    const emailRes = await sendResetEmail({ to: user.email!, token });

    if (!emailRes?.ok) {
      return err("EMAIL_SEND_FAILED", "We couldn’t send the reset email right now. Please try again in a moment.", {
        debug: emailRes?.error ?? null,
      });
    }

    // 5) success response (your wording)
    return ok({
      code: "EMAIL_SENT",
      message: "Reset link sent. It can take a few minutes to arrive — please check your inbox and spam.",
    });
  } catch (e: any) {
    return err("UNEXPECTED", "Something went wrong. Please try again.", {
      debug: e?.message ?? String(e),
    });
  }
}
