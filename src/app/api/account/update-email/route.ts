import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";
import { generateSixDigitCode, hashVerificationCode } from "@/lib/verificationCode";
import { sendEmailChangeCodeEmail } from "@/lib/email";
import { getStripe } from "@/lib/stripe";

const MAX_IMAGE_LENGTH = 1_000_000;
const EMAIL_CHANGE_PREFIX = "email-change:";
const EMAIL_CHANGE_TTL_MS = 10 * 60 * 1000;

type RequestAction = "request-code" | "verify-code";

function emailChangeIdentifier(userId: string, email: string): string {
  return `${EMAIL_CHANGE_PREFIX}${userId}:${email}`;
}

function isManagedByCredentials(providers: string[]) {
  return providers.length === 0 || providers.includes("credentials");
}

type EmailOwnerState =
  | { status: "none" }
  | { status: "self" }
  | { status: "blocking" }
  | { status: "reclaimable"; userId: string };

async function getEmailOwnerState(email: string, currentUserId: string): Promise<EmailOwnerState> {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      emailVerified: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!existing) return { status: "none" };
  if (existing.id === currentUserId) return { status: "self" };

  const linkedOauthCount = await prisma.account.count({
    where: { userId: existing.id, provider: { not: "credentials" } },
  });
  const hasBilling = Boolean(existing.stripeCustomerId || existing.stripeSubscriptionId);
  const reclaimable = !existing.emailVerified && linkedOauthCount === 0 && !hasBilling;

  if (reclaimable) {
    return { status: "reclaimable", userId: existing.id };
  }
  return { status: "blocking" };
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  if (Object.prototype.hasOwnProperty.call(body, "image")) {
    const raw = typeof body.image === "string" ? body.image.trim() : "";
    if (!raw) {
      await prisma.user.update({
        where: { id: userId },
        data: { image: null },
      });
      return NextResponse.json({ success: true });
    }
    if (raw.length > MAX_IMAGE_LENGTH) {
      return NextResponse.json({ error: "Image is too large." }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { image: raw },
    });
    return NextResponse.json({ success: true });
  }

  const providers = session.user.providers ?? [];
  const canManageEmail = isManagedByCredentials(providers);
  if (!canManageEmail) {
    const managedByGoogle = providers.includes("google");
    return NextResponse.json(
      {
        error: managedByGoogle
          ? "Your email is handled by Google."
          : "Email changes are disabled for your sign-in method.",
      },
      { status: 403 }
    );
  }

  const action: RequestAction =
    body.action === "verify-code" || body.action === "request-code"
      ? body.action
      : "request-code";
  const rawEmail =
    typeof body.newEmail === "string"
      ? body.newEmail
      : typeof body.email === "string"
        ? body.email
        : "";
  const normalized = rawEmail.trim().toLowerCase();

  if (!normalized || !normalized.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, stripeCustomerId: true },
  });
  const currentEmail = (currentUser?.email ?? "").trim().toLowerCase();

  if (normalized === currentEmail) {
    return NextResponse.json({ error: "Enter a different email address." }, { status: 400 });
  }

  const ownerState = await getEmailOwnerState(normalized, userId);
  if (ownerState.status === "blocking") {
    return NextResponse.json(
      { error: "This email is already linked to an account." },
      { status: 409 }
    );
  }

  if (action === "request-code") {
    const limit = await rateLimit(req, {
      keyPrefix: "account-email-change-request",
      windowMs: 60_000,
      max: 5,
    });
    if (!limit.ok) {
      return NextResponse.json({ error: "Please wait a moment before requesting another code." }, { status: 429 });
    }

    const code = generateSixDigitCode();
    const token = hashVerificationCode(code);
    const identifier = emailChangeIdentifier(userId, normalized);

    await prisma.verificationToken.deleteMany({
      where: { identifier: { startsWith: `${EMAIL_CHANGE_PREFIX}${userId}:` } },
    });

    await prisma.verificationToken.create({
      data: {
        identifier,
        token,
        expires: new Date(Date.now() + EMAIL_CHANGE_TTL_MS),
      },
    });

    const sendResult = await sendEmailChangeCodeEmail({ to: normalized, code });
    if (!sendResult.ok) {
      return NextResponse.json(
        { error: "We couldn’t send the verification code. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "We sent a 6-digit code to your new email.",
    });
  }

  const verifyLimit = await rateLimit(req, {
    keyPrefix: "account-email-change-verify",
    windowMs: 60_000,
    max: 8,
  });
  if (!verifyLimit.ok) {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 400 });
  }

  const rawCode = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(rawCode)) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const identifier = emailChangeIdentifier(userId, normalized);
  const hashedCode = hashVerificationCode(rawCode);

  const verification = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token: hashedCode,
    },
  });

  if (!verification || verification.expires < new Date()) {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 400 });
  }

  const updateResult = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.user.findUnique({
      where: { email: normalized },
      select: {
        id: true,
        emailVerified: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (duplicate && duplicate.id !== userId) {
      const linkedOauthCount = await tx.account.count({
        where: { userId: duplicate.id, provider: { not: "credentials" } },
      });
      const hasBilling = Boolean(duplicate.stripeCustomerId || duplicate.stripeSubscriptionId);
      const reclaimable = !duplicate.emailVerified && linkedOauthCount === 0 && !hasBilling;

      if (!reclaimable) {
        return { conflict: true as const, stripeCustomerId: null as string | null };
      }

      await tx.user.update({
        where: { id: duplicate.id },
        data: { email: null },
      });
      await tx.verificationToken.deleteMany({
        where: { identifier: duplicate.id },
      });
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { email: normalized },
      select: { stripeCustomerId: true },
    });

    await tx.verificationToken.deleteMany({
      where: { identifier: { startsWith: `${EMAIL_CHANGE_PREFIX}${userId}:` } },
    });

    return { conflict: false as const, stripeCustomerId: updated.stripeCustomerId ?? null };
  });

  if (updateResult.conflict) {
    return NextResponse.json(
      { error: "This email is already linked to an account." },
      { status: 409 }
    );
  }

  if (updateResult.stripeCustomerId) {
    try {
      const stripe = getStripe();
      await stripe.customers.update(updateResult.stripeCustomerId, { email: normalized });
    } catch (error) {
      console.error("[account.update-email] Failed to update Stripe customer email", error);
    }
  }

  return NextResponse.json({ success: true, email: normalized, message: "Email updated." });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });
  return NextResponse.json({ success: true, image: user?.image ?? null });
}
