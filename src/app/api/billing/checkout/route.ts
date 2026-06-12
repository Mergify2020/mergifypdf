import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { captureServerEvent } from "@/lib/posthogServer";
import { resolveStripeCustomerIdForUser } from "@/lib/stripeCustomers";
import {
  ALLOWED_PRICE_IDS,
  getPlanTierFromPriceId,
} from "@/lib/billingPlans";

export async function POST(req: NextRequest) {
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

  const { priceId } = body as { priceId?: unknown };

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
    const origin = req.headers.get("origin") ?? req.nextUrl.origin;
    const successUrl = `${origin}/pricing?status=success`;
    const cancelUrl = `${origin}/pricing?canceled=true`;

    const normalizedEmail = (user.email ?? session.user.email ?? "").trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json({ error: "User email missing" }, { status: 400 });
    }
    const customerName = user.name ?? session.user.name ?? undefined;
    const customerId = await resolveStripeCustomerIdForUser({
      userId: user.id,
      email: normalizedEmail,
      name: customerName,
      stripeCustomerId: user.stripeCustomerId,
    });

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
        },
      },
      {
        idempotencyKey: `checkout-${user.id}-${pendingCheckoutId}`,
      }
    );

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "No checkout URL returned from Stripe" }, { status: 500 });
    }

    await captureServerEvent({
      distinctId: user.id,
      event: "checkout_session_created",
      properties: {
        source: "api.billing.checkout",
        planTier: selectedPlanTier,
        priceId,
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: checkoutSession.id,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating Stripe Checkout Session", error);
    return NextResponse.json({ error: "Stripe checkout error" }, { status: 500 });
  }
}
