import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getStripe } from "@/lib/stripe";
import { isSameOrigin } from "@/lib/requestGuards";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import {
  ALLOWED_PRICE_IDS,
  getPlanTierFromPriceId,
  getTrialEligibilityForUser,
} from "@/lib/billingPlans";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const stripe = getStripe();
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user?.stripeStatus === "active" || user?.stripeStatus === "trialing") {
    return NextResponse.json({ error: "Subscription already active" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { priceId, skipTrial } = body as { priceId?: unknown; skipTrial?: unknown };

  if (!priceId || typeof priceId !== "string") {
    return NextResponse.json({ error: "Missing or invalid priceId" }, { status: 400 });
  }
  if (!ALLOWED_PRICE_IDS.has(priceId)) {
    return NextResponse.json({ error: "Unknown priceId" }, { status: 400 });
  }
  const selectedPlanTier = getPlanTierFromPriceId(priceId);
  if (!selectedPlanTier) {
    return NextResponse.json({ error: "Unknown plan for provided priceId" }, { status: 400 });
  }

  try {
    const origin = req.nextUrl.origin;
    const successUrl = `${origin}/pricing?status=success`;
    const cancelUrl = `${origin}/pricing?canceled=true`;

    const wantsTrial = skipTrial !== true;
    const trialEligibility = getTrialEligibilityForUser({
      essentialPlusTrialUsedAt: user?.essentialPlusTrialUsedAt,
      signatureProTrialUsedAt: user?.signatureProTrialUsedAt,
      legacyTrialUsedAt: user?.trialUsedAt,
    });
    const eligibleForTrial =
      selectedPlanTier === "essential_plus"
        ? trialEligibility.eligibleForTrialByPlan.essentialPlus
        : trialEligibility.eligibleForTrialByPlan.signaturePro;
    const trialAllowed = wantsTrial && eligibleForTrial;

    const normalizedEmail = (user.email ?? session.user.email ?? "").trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json({ error: "User email missing" }, { status: 400 });
    }
    const customerName = user.name ?? session.user.name ?? undefined;
    let customerId = user.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: normalizedEmail,
        name: customerName,
        metadata: { appUserId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    } else {
      await stripe.customers.update(customerId, {
        email: normalizedEmail,
        name: customerName,
        metadata: { appUserId: user.id },
      });
    }

    const now = new Date();
    const isPendingFresh =
      user?.pendingCheckoutId &&
      user?.pendingCheckoutCreatedAt &&
      now.getTime() - user.pendingCheckoutCreatedAt.getTime() < 15 * 60 * 1000;
    const pendingCheckoutId = isPendingFresh ? user?.pendingCheckoutId : randomUUID();
    if (!isPendingFresh) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pendingCheckoutId,
          pendingCheckoutCreatedAt: now,
        },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer: customerId,
        client_reference_id: user.id,
        metadata: { appUserId: user.id },
        allow_promotion_codes: true,
        subscription_data: {
          metadata: { appUserId: user.id },
          ...(trialAllowed ? { trial_period_days: 7 } : {}),
        },
      },
      {
        idempotencyKey: `checkout-${user.id}-${pendingCheckoutId}`,
      }
    );

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "No checkout URL returned from Stripe" }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating Stripe Checkout Session", error);
    return NextResponse.json({ error: "Stripe checkout error" }, { status: 500 });
  }
}
