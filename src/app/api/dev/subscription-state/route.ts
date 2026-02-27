import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { guardDevRoute } from "@/lib/devRouteGuard";
import {
  BILLING_PRICE_IDS,
  type BillingPlanTier,
} from "@/lib/billingPlans";

type DevSubscriptionState =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired";

const ALLOWED_STATES: DevSubscriptionState[] = [
  "none",
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
];

const ALLOWED_TIERS: BillingPlanTier[] = ["essential_plus", "signature_pro"];
const ALLOWED_INTERVALS = ["monthly", "annual"] as const;
type BillingInterval = (typeof ALLOWED_INTERVALS)[number];

function fakeSubscriptionId(userId: string) {
  return `dev_sub_${userId.slice(-10)}`;
}

export async function GET(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      stripeStatus: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}

export async function POST(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(
    () =>
      ({} as {
        state?: unknown;
        tier?: unknown;
        interval?: unknown;
        daysUntilPeriodEnd?: unknown;
      }),
  );
  const requestedState = typeof body.state === "string" ? body.state : "";
  if (!ALLOWED_STATES.includes(requestedState as DevSubscriptionState)) {
    return NextResponse.json(
      { error: "Invalid state", allowedStates: ALLOWED_STATES },
      { status: 400 }
    );
  }

  const state = requestedState as DevSubscriptionState;
  const requestedTier =
    typeof body.tier === "string" ? (body.tier as BillingPlanTier) : undefined;
  if (requestedTier && !ALLOWED_TIERS.includes(requestedTier)) {
    return NextResponse.json(
      { error: "Invalid tier", allowedTiers: ALLOWED_TIERS },
      { status: 400 },
    );
  }

  const requestedInterval =
    typeof body.interval === "string" ? (body.interval as BillingInterval) : "monthly";
  if (!ALLOWED_INTERVALS.includes(requestedInterval)) {
    return NextResponse.json(
      { error: "Invalid interval", allowedIntervals: ALLOWED_INTERVALS },
      { status: 400 },
    );
  }

  const daysUntilPeriodEndRaw = body.daysUntilPeriodEnd;
  const daysUntilPeriodEnd =
    typeof daysUntilPeriodEndRaw === "number" && Number.isFinite(daysUntilPeriodEndRaw)
      ? Math.max(1, Math.round(daysUntilPeriodEndRaw))
      : state === "trialing"
        ? 7
        : 30;

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripePriceId: true },
  });

  const nextPriceId =
    state === "none"
      ? null
      : requestedTier
        ? BILLING_PRICE_IDS[requestedTier][requestedInterval]
        : existing?.stripePriceId ?? BILLING_PRICE_IDS.essential_plus.monthly;

  const now = new Date();
  const periodEnd = new Date(now.getTime() + daysUntilPeriodEnd * 24 * 60 * 60 * 1000);
  const fakeSubId = fakeSubscriptionId(session.user.id);

  const data =
    state === "none"
      ? {
          stripeStatus: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
        }
      : {
          stripeStatus: state,
          stripeSubscriptionId: fakeSubId,
          stripePriceId: nextPriceId,
          stripeCurrentPeriodEnd: periodEnd,
        };

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      email: true,
      stripeStatus: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  return NextResponse.json({
    ok: true,
    appliedState: state,
    appliedTier: requestedTier ?? null,
    appliedInterval: requestedInterval,
    appliedDaysUntilPeriodEnd: daysUntilPeriodEnd,
    user: updated,
  });
}
