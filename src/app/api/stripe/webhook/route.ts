import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import { getPlanTierFromPriceId } from "@/lib/billingPlans";
import { captureServerEvent } from "@/lib/posthogServer";

function normalizeAppUserId(candidate: unknown): string | null {
  if (typeof candidate !== "string") return null;
  const normalized = candidate.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new NextResponse("Webhook configuration error", { status: 500 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Invalid signature";
    console.error("Stripe webhook signature verification failed", errorMessage);
    return new NextResponse(`Webhook Error: ${errorMessage}`, {
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
          const appUserId =
            normalizeAppUserId(session.client_reference_id)
            ?? normalizeAppUserId(session.metadata?.appUserId);

          if (customerId && subscriptionId) {
            const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
            const subscription = subscriptionResponse as Stripe.Subscription;
            const priceId = subscription.items.data[0]?.price?.id ?? null;
            const status = subscription.status ?? null;
            const currentPeriodEndSeconds = (subscription as { current_period_end?: number })
              .current_period_end;
            const currentPeriodEnd = currentPeriodEndSeconds
              ? new Date(currentPeriodEndSeconds * 1000)
              : null;
            const matchFilters = [
              ...(appUserId ? [{ id: appUserId }] : []),
              { stripeSubscriptionId: subscriptionId },
              { stripeCustomerId: customerId },
              ...(email ? [{ email }] : []),
            ];
            const matchedUser = await prisma.user.findFirst({
              where: { OR: matchFilters },
              select: { id: true },
            });

            if (matchedUser) {
              await prisma.user.update({
                where: { id: matchedUser.id },
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

              await captureServerEvent({
                distinctId: matchedUser.id,
                event: "subscription_checkout_completed",
                properties: {
                  source: "api.stripe.webhook",
                  stripeEventType: event.type,
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: subscriptionId,
                  stripePriceId: priceId,
                  subscriptionStatus: status,
                  planTier: getPlanTierFromPriceId(priceId) ?? "unknown",
                },
              });
            }
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
          const appUserId = normalizeAppUserId(subscription.metadata?.appUserId);
          const currentPeriodEndSeconds = (subscription as { current_period_end?: number })
            .current_period_end;
          const currentPeriodEnd = currentPeriodEndSeconds
            ? new Date(currentPeriodEndSeconds * 1000)
            : null;
          const matchFilters = [
            ...(appUserId ? [{ id: appUserId }] : []),
            { stripeSubscriptionId: subscriptionId },
            ...(customerId ? [{ stripeCustomerId: customerId }] : []),
          ];
          const matchedUser = await prisma.user.findFirst({
            where: { OR: matchFilters },
            select: { id: true },
          });

          if (!matchedUser) break;

          await prisma.user.update({
            where: { id: matchedUser.id },
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

          await captureServerEvent({
            distinctId: matchedUser.id,
            event: event.type === "customer.subscription.deleted"
              ? "subscription_canceled"
              : "subscription_status_changed",
            properties: {
              source: "api.stripe.webhook",
              stripeEventType: event.type,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
              subscriptionStatus: status,
              planTier: getPlanTierFromPriceId(priceId) ?? "unknown",
              trialStart: subscription.trial_start ?? null,
              trialEnd: subscription.trial_end ?? null,
            },
          });

          const trialStart = subscription.trial_start ?? null;
          const trialEnd = subscription.trial_end ?? null;
          const isTrial = status === "trialing" || !!trialEnd;
          if (isTrial) {
            const trialDate = new Date(((trialStart ?? Math.floor(Date.now() / 1000)) as number) * 1000);
            const planTier = getPlanTierFromPriceId(priceId);

            if (planTier === "essential_plus") {
              await prisma.user.update({
                where: {
                  id: matchedUser.id,
                  essentialPlusTrialUsedAt: null,
                },
                data: {
                  essentialPlusTrialUsedAt: trialDate,
                  trialUsedAt: trialDate,
                },
              });
            } else {
              // Signature Pro trial (or unknown legacy tier) should block further trials.
              await prisma.user.update({
                where: {
                  id: matchedUser.id,
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
      case "invoice.paid":
      case "invoice.payment_failed":
        {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
          const invoiceSubscription = (invoice as { subscription?: unknown }).subscription;
          const subscriptionId = typeof invoiceSubscription === "string"
            ? invoiceSubscription
            : null;
          const matchedUser = await prisma.user.findFirst({
            where: {
              OR: [
                ...(subscriptionId ? [{ stripeSubscriptionId: subscriptionId }] : []),
                ...(customerId ? [{ stripeCustomerId: customerId }] : []),
              ],
            },
            select: { id: true, stripePriceId: true, stripeStatus: true },
          });
          if (!matchedUser) break;

          await captureServerEvent({
            distinctId: matchedUser.id,
            event: event.type === "invoice.paid" ? "invoice_paid" : "invoice_payment_failed",
            properties: {
              source: "api.stripe.webhook",
              stripeEventType: event.type,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: matchedUser.stripePriceId ?? null,
              subscriptionStatus: matchedUser.stripeStatus ?? null,
              amountDue: typeof invoice.amount_due === "number" ? invoice.amount_due : null,
              amountPaid: typeof invoice.amount_paid === "number" ? invoice.amount_paid : null,
              currency: invoice.currency ?? null,
              planTier: getPlanTierFromPriceId(matchedUser.stripePriceId) ?? "unknown",
            },
          });
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
