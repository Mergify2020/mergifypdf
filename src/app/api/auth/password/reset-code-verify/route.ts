import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { hashVerificationCode } from "@/lib/verificationCode";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

type Json = Record<string, unknown>;

function ok(json: Json) {
  return NextResponse.json({ ok: true, ...json });
}

function err(code: string, message: string, extra?: Json) {
  return NextResponse.json({ ok: false, code, message, ...(extra ?? {}) });
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
  const limit = await rateLimit(req, { keyPrefix: "reset-code-verify", windowMs: 60_000, max: 8 });
  if (!limit.ok) {
    return err("INVALID_CODE", "That code is invalid or expired.");
  }
  try {
    const rawBody: unknown = await req.json().catch(() => null);
    const email =
      isRecord(rawBody) && typeof rawBody.email === "string" ? rawBody.email : undefined;
    const code =
      isRecord(rawBody) && typeof rawBody.code === "string" ? rawBody.code : undefined;

    if (!email || !email.includes("@")) {
      return err("BAD_REQUEST", "Please provide a valid email address.");
    }
    if (!code || !/^\d{6}$/.test(code)) {
      return err("BAD_REQUEST", "Please enter the 6-digit code.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (!user) {
      return err("INVALID_CODE", "That code is invalid or expired.");
    }

    const hashed = hashVerificationCode(code);
    const existing = await prisma.resetToken.findFirst({
      where: { userId: user.id, token: hashed },
    });

    if (!existing || existing.expiresAt < new Date()) {
      return err("INVALID_CODE", "That code is invalid or expired.");
    }

    let newToken = await generateToken(user.id);
    const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const updated = await prisma.resetToken.update({
          where: { id: existing.id },
          data: { token: newToken, expiresAt: newExpiresAt },
        });

        return ok({ token: updated.token });
      } catch (error) {
        const details = asPrismaError(error);
        const isUnique =
          details?.code === "P2002" ||
          (details?.message ? details.message.toLowerCase().includes("unique") : false);
        if (isUnique && attempt < 3) {
          newToken = await generateToken(user.id);
          continue;
        }
        throw error;
      }
    }

    return err("TOKEN_RETRY_FAILED", "Unable to verify code. Please try again.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return err("UNEXPECTED", message);
  }
}
