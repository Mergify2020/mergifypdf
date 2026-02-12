import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getStripe } from "@/lib/stripe";
import { isSameOrigin } from "@/lib/requestGuards";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const ALLOWED_PRICE_IDS = new Set([
  "price_1Sa3MPJCQrZL3P2hvT5zgJxa",
  "price_1Sa3NOJCQrZL3P2h4qkploLe",
  "price_1Sa3L6JCQrZL3P2hcbGBWN7P",
  "price_1Sa3OSJCQrZL3P2hqw2zxi9w",
]);

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

  try {
    const origin = req.nextUrl.origin;
    const successUrl = `${origin}/pricing?status=success`;
    const cancelUrl = `${origin}/pricing?canceled=true`;

    const wantsTrial = skipTrial !== true;
    const eligibleForTrial = !user?.trialUsedAt;
    const trialAllowed = wantsTrial && eligibleForTrial;

    const now = new Date();
    const isPendingFresh =
      user?.pendingCheckoutId &&
      user?.pendingCheckoutCreatedAt &&
      now.getTime() - user.pendingCheckoutCreatedAt.getTime() < 15 * 60 * 1000;
    const pendingCheckoutId = isPendingFresh ? user?.pendingCheckoutId : randomUUID();
    if (!isPendingFresh) {
      await prisma.user.update({
        where: { email: session.user.email ?? "" },
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
      customer_email: session.user.email ?? undefined,
      allow_promotion_codes: true,
      subscription_data: trialAllowed ? { trial_period_days: 3 } : undefined,
      },
      {
        idempotencyKey: `checkout-${user?.id ?? "unknown"}-${pendingCheckoutId}`,
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
