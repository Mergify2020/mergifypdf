import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { deleteR2Objects, getR2Config } from "@/lib/r2";
import { getStripe } from "@/lib/stripe";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

type BlockingBillingStatus = "active" | "trialing" | "past_due" | "unpaid";
type AccountDeletionReason =
  | "too_expensive"
  | "missing_features"
  | "found_another_tool"
  | "not_using_enough"
  | "technical_issues";

const ACCOUNT_DELETION_REASONS = new Set<AccountDeletionReason>([
  "too_expensive",
  "missing_features",
  "found_another_tool",
  "not_using_enough",
  "technical_issues",
]);

function isBlockingBillingStatus(status: string | null | undefined): status is BlockingBillingStatus {
  return status === "active" || status === "trialing" || status === "past_due" || status === "unpaid";
}

function isAccountDeletionReason(value: string): value is AccountDeletionReason {
  return ACCOUNT_DELETION_REASONS.has(value as AccountDeletionReason);
}

function chunkArray<T>(values: T[], size: number): T[][] {
  if (size <= 0) return [values];
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const limit = await rateLimit(req, { keyPrefix: "account-delete", windowMs: 60_000, max: 5 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = session.user.providers ?? [];
  const hasCredentialsAccess = providers.length === 0 || providers.includes("credentials");

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const password = typeof body.password === "string" ? body.password.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (hasCredentialsAccess) {
    if (!password) {
      return NextResponse.json({ error: "Enter your password to delete your account." }, { status: 400 });
    }
  }
  if (!isAccountDeletionReason(reason)) {
    return NextResponse.json({ error: "Select a reason for deleting your account." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      password: true,
      stripeStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let blockingBillingStatus: BlockingBillingStatus | null = null;
  if (user.stripeSubscriptionId) {
    try {
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      if (isBlockingBillingStatus(subscription.status)) {
        blockingBillingStatus = subscription.status;
      }
    } catch {
      if (isBlockingBillingStatus(user.stripeStatus)) {
        blockingBillingStatus = user.stripeStatus;
      }
    }
  } else if (isBlockingBillingStatus(user.stripeStatus)) {
    blockingBillingStatus = user.stripeStatus;
  }

  if (blockingBillingStatus) {
    return NextResponse.json(
      { error: "You need to cancel your subscription or trial before deleting your account." },
      { status: 409 }
    );
  }

  if (hasCredentialsAccess && !user.password) {
    return NextResponse.json(
      { error: "Set a password before deleting your account." },
      { status: 400 }
    );
  }

  if (hasCredentialsAccess) {
    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return NextResponse.json({ error: "The password you entered is incorrect." }, { status: 400 });
    }
  }

  await prisma.accountDeletionRecord.create({
    data: {
      userId: session.user.id,
      email: user.email,
      reason,
      reasonDetail: null,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      stripePriceId: user.stripePriceId,
      stripeStatus: user.stripeStatus,
    },
  });

  const projectKeys = await prisma.project.findMany({
    where: { userId: session.user.id },
    select: {
      pdfKey: true,
      previewKey: true,
    },
  });

  const keysToDelete = projectKeys.flatMap((project) =>
    [project.pdfKey, project.previewKey].filter(
      (key): key is string => typeof key === "string" && key.length > 0
    )
  );

  if (keysToDelete.length > 0) {
    try {
      const r2Config = getR2Config();
      for (const batch of chunkArray(keysToDelete, 1000)) {
        await deleteR2Objects(r2Config, batch);
      }
    } catch (error) {
      console.error("[account/delete] Failed to delete R2 objects before account removal", {
        userId: session.user.id,
        error,
      });
      return NextResponse.json(
        { error: "We couldn’t remove your files from storage right now. Please try again." },
        { status: 503 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId: session.user.id } });
    await tx.account.deleteMany({ where: { userId: session.user.id } });
    await tx.resetToken.deleteMany({ where: { userId: session.user.id } });
    await tx.project.deleteMany({ where: { userId: session.user.id } });
    await tx.verificationToken.deleteMany({
      where: { identifier: { contains: session.user.id } },
    });
    await tx.user.deleteMany({ where: { id: session.user.id } });
  });

  const remainingUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true },
  });
  if (remainingUser) {
    await prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId: session.user.id } });
      await tx.account.deleteMany({ where: { userId: session.user.id } });
      await tx.resetToken.deleteMany({ where: { userId: session.user.id } });
      await tx.project.deleteMany({ where: { userId: session.user.id } });
      await tx.verificationToken.deleteMany({
        where: { identifier: { contains: session.user.id } },
      });
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          email: null,
          name: null,
          image: null,
          password: null,
          emailVerified: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeStatus: null,
          stripeCurrentPeriodEnd: null,
          essentialPlusTrialUsedAt: null,
          signatureProTrialUsedAt: null,
          trialUsedAt: null,
          pendingCheckoutId: null,
          pendingCheckoutCreatedAt: null,
          twoFactorEnabled: false,
          twoFactorMethod: null,
          twoFactorPhone: null,
        },
      });
    });
    console.warn("[account/delete] User row remained after delete; anonymized fallback applied", {
      userId: session.user.id,
      email: remainingUser.email,
    });
  }

  return NextResponse.json({ success: true });
}
