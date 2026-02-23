import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import { getPlanTierFromPriceId } from "@/lib/billingPlans";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new NextResponse("Webhook configuration error", { status: 500 });
  }

  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed", err?.message ?? err);
    return new NextResponse(`Webhook Error: ${err?.message ?? "Invalid signature"}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        {
          const session = event.data.object as Stripe.Checkout.Session;
          const email = session.customer_details?.email ?? session.customer_email ?? null;
          const customerId = typeof session.customer === "string" ? session.customer : null;
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : null;

          if (email && customerId && subscriptionId) {
            const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
            const subscription = subscriptionResponse as Stripe.Subscription;
            const priceId = subscription.items.data[0]?.price?.id ?? null;
            const status = subscription.status ?? null;
            const currentPeriodEndSeconds = (subscription as { current_period_end?: number })
              .current_period_end;
            const currentPeriodEnd = currentPeriodEndSeconds
              ? new Date(currentPeriodEndSeconds * 1000)
              : null;

            await prisma.user.updateMany({
              where: { email },
              data: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: priceId,
                stripeStatus: status,
                stripeCurrentPeriodEnd: currentPeriodEnd,
                pendingCheckoutId: null,
                pendingCheckoutCreatedAt: null,
              },
            });
          }
        }
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        {
          const subscription = event.data.object as Stripe.Subscription;
          const subscriptionId = subscription.id;
          const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
          const priceId = subscription.items.data[0]?.price?.id ?? null;
          const status = subscription.status ?? null;
          const currentPeriodEndSeconds = (subscription as { current_period_end?: number })
            .current_period_end;
          const currentPeriodEnd = currentPeriodEndSeconds
            ? new Date(currentPeriodEndSeconds * 1000)
            : null;
          const matchFilters = [
            { stripeSubscriptionId: subscriptionId },
            ...(customerId ? [{ stripeCustomerId: customerId }] : []),
          ];

          await prisma.user.updateMany({
            where: {
              OR: matchFilters,
            },
            data: {
              stripeCustomerId: customerId ?? undefined,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
              stripeStatus: status,
              stripeCurrentPeriodEnd: currentPeriodEnd,
              pendingCheckoutId: null,
              pendingCheckoutCreatedAt: null,
            },
          });

          const trialStart = subscription.trial_start ?? null;
          const trialEnd = subscription.trial_end ?? null;
          const isTrial = status === "trialing" || !!trialEnd;
          if (isTrial) {
            const trialDate = new Date(((trialStart ?? Math.floor(Date.now() / 1000)) as number) * 1000);
            const planTier = getPlanTierFromPriceId(priceId);

            if (planTier === "essential_plus") {
              await prisma.user.updateMany({
                where: {
                  OR: matchFilters,
                  essentialPlusTrialUsedAt: null,
                },
                data: {
                  essentialPlusTrialUsedAt: trialDate,
                  trialUsedAt: trialDate,
                },
              });
            } else {
              // Signature Pro trial (or unknown legacy tier) should block further trials.
              await prisma.user.updateMany({
                where: {
                  OR: matchFilters,
                  signatureProTrialUsedAt: null,
                },
                data: {
                  signatureProTrialUsedAt: trialDate,
                  trialUsedAt: trialDate,
                },
              });
            }
          }
        }
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("Error handling Stripe webhook event", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
