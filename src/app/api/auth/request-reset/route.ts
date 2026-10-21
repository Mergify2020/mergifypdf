// src/app/api/auth/request-reset/route.ts — REPLACE EVERYTHING
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSixDigitCode, hashVerificationCode } from "@/lib/verificationCode";
import { randomUUID } from "crypto";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// how many times to retry if "token" hits the unique constraint
const MAX_TOKEN_RETRIES = 3;

type Json = Record<string, unknown>;

function ok(json: Json) {
  return NextResponse.json({ ok: true, ...json });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type MaybePrismaError = { code?: string; message?: string };
function asPrismaError(value: unknown): MaybePrismaError | null {
  return isRecord(value) ? (value as MaybePrismaError) : null;
}


export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, code: "INVALID_ORIGIN", message: "Invalid origin." }, { status: 403 });
  }
  const limit = await rateLimit(req, { keyPrefix: "reset-request", windowMs: 60_000, max: 5 });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: true, code: "REQUESTED", message: "If an account exists for that email, a reset code has been sent." }
    );
  }
  try {
    const rawBody: unknown = await req.json().catch(() => null);
    const email =
      isRecord(rawBody) && typeof rawBody.email === "string" ? rawBody.email : undefined;
    if (!email || !email.includes("@")) {
      return ok({
        code: "REQUESTED",
        message: "If an account exists for that email, a reset code has been sent.",
      });
    }

    // 1) find user
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, password: true, emailVerified: true },
    });

    if (!user) {
      return ok({
        code: "REQUESTED",
        message: "If an account exists for that email, a reset code has been sent.",
      });
    }

    const oauthLinks = await prisma.account.count({
      where: { userId: user.id, provider: { not: "credentials" } },
    });

    if (oauthLinks > 0) {
      return ok({
        code: "REQUESTED",
        message: "If an account exists for that email, a reset code has been sent.",
      });
    }

    if (!user.password || !user.emailVerified) {
      return ok({
        code: "REQUESTED",
        message: "If an account exists for that email, a reset code has been sent.",
      });
    }

    // 2) generate a 6-digit code and hash it
    let code = generateSixDigitCode();
    let token: string = hashVerificationCode(code);

    // 3) write row to public.ResetToken with required columns
    //    (id, token, userId, expiresAt, createdAt, updatedAt)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const now = new Date();

    await prisma.resetToken.deleteMany({ where: { userId: user.id } });

    for (let attempt = 1; attempt <= MAX_TOKEN_RETRIES; attempt++) {
      try {
        await prisma.resetToken.create({
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
      } catch (error) {
        // If unique constraint on token fires, generate a new token and retry
        const details = asPrismaError(error);
        const isUnique =
          details?.code === "P2002" ||
          (details?.message ? details.message.toLowerCase().includes("unique") : false);
        if (isUnique && attempt < MAX_TOKEN_RETRIES) {
          code = generateSixDigitCode();
          token = hashVerificationCode(code);
          continue;
        }
        // any other error (or retries exhausted)
        return ok({
          code: "REQUESTED",
          message: "If an account exists for that email, a reset code has been sent.",
        });
      }
    }

    // 4) send the email
    const { sendResetEmail } = await import("@/lib/email");
    const emailRes = await sendResetEmail({ to: user.email!, code });

    if (!emailRes.ok) {
      return ok({
        code: "REQUESTED",
        message: "If an account exists for that email, a reset code has been sent.",
      });
    }

    // 5) success response (your wording)
    return ok({
      code: "REQUESTED",
      message: "If an account exists for that email, a reset code has been sent.",
    });
  } catch {
    return ok({
      code: "REQUESTED",
      message: "If an account exists for that email, a reset code has been sent.",
    });
  }
}
