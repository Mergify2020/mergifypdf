import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type Stripe from "stripe";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { BILLING_PRICE_IDS, getPlanTierFromPriceId } from "@/lib/billingPlans";
import { getStripe } from "@/lib/stripe";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

type BlockingBillingStatus = "active" | "trialing" | "past_due" | "unpaid";

type DeleteBillingCheckResponse =
  | {
      ok: true;
      requiresBillingAction: false;
    }
  | {
      ok: true;
      requiresBillingAction: true;
      title: string;
      message: string;
    };

function isBlockingBillingStatus(status: string | null | undefined): status is BlockingBillingStatus {
  return status === "active" || status === "trialing" || status === "past_due" || status === "unpaid";
}

function formatCurrencyAmount(
  unitAmount: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (typeof unitAmount !== "number" || !Number.isFinite(unitAmount)) return null;
  const normalizedCurrency = typeof currency === "string" && currency.trim()
    ? currency.trim().toUpperCase()
    : "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
    }).format(unitAmount / 100);
  } catch {
    return `${normalizedCurrency} ${(unitAmount / 100).toFixed(2)}`;
  }
}

function formatBillingCycle(price: Stripe.Price | null | undefined): string | null {
  const recurring = price?.recurring;
  if (!recurring?.interval) return null;
  const count = recurring.interval_count ?? 1;
  if (recurring.interval === "month") {
    return count === 1 ? "monthly" : `every ${count} months`;
  }
  if (recurring.interval === "year") {
    return count === 1 ? "yearly" : `every ${count} years`;
  }
  if (recurring.interval === "week") {
    return count === 1 ? "weekly" : `every ${count} weeks`;
  }
  if (recurring.interval === "day") {
    return count === 1 ? "daily" : `every ${count} days`;
  }
  return recurring.interval;
}

function formatPricePhrase(price: Stripe.Price | null | undefined): string | null {
  const amount = formatCurrencyAmount(price?.unit_amount ?? null, price?.currency ?? null);
  const cycle = formatBillingCycle(price);
  if (!amount && !cycle) return null;
  if (amount && cycle) return `billed ${cycle} at ${amount}`;
  if (amount) return `at ${amount}`;
  return cycle;
}

function getPriceIdDisplayPhrase(priceId: string | null | undefined): string | null {
  switch (priceId) {
    case BILLING_PRICE_IDS.essential_plus.monthly:
      return "billed monthly at $12.99";
    case BILLING_PRICE_IDS.essential_plus.annual:
      return "billed yearly at $7.99";
    case BILLING_PRICE_IDS.signature_pro.monthly:
      return "billed monthly at $19.99";
    case BILLING_PRICE_IDS.signature_pro.annual:
      return "billed yearly at $11.99";
    default:
      return null;
  }
}

function formatDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function buildBlockingMessage(input: {
  status: BlockingBillingStatus;
  tierName: string | null;
  price: Stripe.Price | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
}): DeleteBillingCheckResponse {
  const { status, tierName, price, currentPeriodEnd, trialEnd } = input;
  const planName = tierName ?? "your plan";
  const pricePhrase = formatPricePhrase(price);

  if (status === "trialing") {
    const formattedTrialEnd = formatDate(trialEnd ?? currentPeriodEnd);
    const cycleText = formattedTrialEnd ? ` that ends on ${formattedTrialEnd}` : "";
    return {
      ok: true,
      requiresBillingAction: true,
      title: "Cancel your trial first",
      message: `You are currently on a ${planName} trial${cycleText}. Cancel it in Billing before deleting your account.`,
    };
  }

  if (status === "past_due" || status === "unpaid") {
    const formattedDueDate = formatDate(currentPeriodEnd);
    const cycleText = formattedDueDate
      ? ` ${status === "past_due" ? `Past due since ${formattedDueDate}.` : `Overdue since ${formattedDueDate}.`}`
      : "";
    const priceText = pricePhrase ? ` ${pricePhrase}.` : "";
    return {
      ok: true,
      requiresBillingAction: true,
      title: "Cancel your plan first",
      message: `You have an overdue ${planName} subscription${priceText}${cycleText} Cancel it in Billing before deleting your account.`,
    };
  }

  const formattedRenewal = formatDate(currentPeriodEnd);
  const renewalText = formattedRenewal ? ` Renews on ${formattedRenewal}.` : "";
  const priceText = pricePhrase ? ` ${pricePhrase}.` : "";
  return {
    ok: true,
    requiresBillingAction: true,
    title: "Cancel your plan first",
    message: `You are currently on ${planName}${priceText}${renewalText} Cancel it in Billing before deleting your account.`,
  };
}

function buildStoredBlockingMessage(input: {
  status: BlockingBillingStatus;
  stripePriceId: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
}): DeleteBillingCheckResponse {
  const tier = getPlanTierFromPriceId(input.stripePriceId ?? null);
  const planName = tier === "essential_plus" ? "Essential Plus" : tier === "signature_pro" ? "Signature Pro" : "your plan";
  const pricePhrase = getPriceIdDisplayPhrase(input.stripePriceId);

  if (input.status === "trialing") {
    const formattedTrialEnd = formatDate(input.trialEnd ?? input.currentPeriodEnd);
    const cycleText = formattedTrialEnd ? ` that ends on ${formattedTrialEnd}` : "";
    return {
      ok: true,
      requiresBillingAction: true,
      title: "Cancel your trial first",
      message: `You are currently on a ${planName} trial${cycleText}. Cancel it in Billing before deleting your account.`,
    };
  }

  if (input.status === "past_due" || input.status === "unpaid") {
    const formattedDueDate = formatDate(input.currentPeriodEnd);
    const cycleText = formattedDueDate
      ? ` ${input.status === "past_due" ? `Past due since ${formattedDueDate}.` : `Overdue since ${formattedDueDate}.`}`
      : "";
    const priceText = pricePhrase ? ` ${pricePhrase}.` : "";
    return {
      ok: true,
      requiresBillingAction: true,
      title: "Cancel your plan first",
      message: `You have an overdue ${planName} subscription${priceText}${cycleText} Cancel it in Billing before deleting your account.`,
    };
  }

  const formattedRenewal = formatDate(input.currentPeriodEnd);
  const renewalText = formattedRenewal ? ` Renews on ${formattedRenewal}.` : "";
  const priceText = pricePhrase ? ` ${pricePhrase}.` : "";
  return {
    ok: true,
    requiresBillingAction: true,
    title: "Cancel your plan first",
    message: `You are currently on ${planName}${priceText}${renewalText} Cancel it in Billing before deleting your account.`,
  };
}

async function loadLiveBlockingSubscription(input: {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  email: string;
}): Promise<{
  subscription: Stripe.Subscription | null;
  price: Stripe.Price | null;
}> {
  const stripe = getStripe();

  async function resolveSubscriptionPrice(subscription: Stripe.Subscription): Promise<Stripe.Price | null> {
    const priceCandidate = subscription.items.data[0]?.price as Stripe.Price | string | null | undefined;
    if (!priceCandidate) return null;
    if (typeof priceCandidate !== "string") return priceCandidate;
    try {
      return await stripe.prices.retrieve(priceCandidate);
    } catch {
      return null;
    }
  }

  if (input.stripeSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(input.stripeSubscriptionId);
      const price = await resolveSubscriptionPrice(subscription);
      return { subscription, price };
    } catch {
      // Fall through to customer/email lookups below.
    }
  }

  const customerIds = new Set<string>();

  if (input.stripeCustomerId) {
    customerIds.add(input.stripeCustomerId);
  }

  if (customerIds.size === 0 && input.email) {
    const customers = await stripe.customers.list({ email: input.email, limit: 10 });
    customers.data.forEach((customer) => {
      if (typeof customer.id === "string" && customer.id.length > 0) {
        customerIds.add(customer.id);
      }
    });
  }

  for (const customerId of customerIds) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const blockingSubscription = subscriptions.data.find((subscription) =>
      isBlockingBillingStatus(subscription.status)
    );
    if (!blockingSubscription) {
      if (subscriptions.data.length > 0) {
        const firstSubscription = subscriptions.data[0];
        const price = await resolveSubscriptionPrice(firstSubscription);
        return { subscription: firstSubscription, price };
      }
      continue;
    }

    const price = await resolveSubscriptionPrice(blockingSubscription);
    return { subscription: blockingSubscription, price };
  }

  return { subscription: null, price: null };
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const limit = await rateLimit(req, { keyPrefix: "account-delete-check", windowMs: 60_000, max: 8 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeStatus: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const liveBilling = await loadLiveBlockingSubscription({
      email: user.email ?? session.user.email,
      stripeCustomerId: user.stripeCustomerId ?? null,
      stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    });

    const liveStatus = liveBilling.subscription?.status ?? null;
    const firstItemPrice = liveBilling.subscription?.items.data[0]?.price as
      | Stripe.Price
      | string
      | null
      | undefined;
    const livePriceId = typeof firstItemPrice === "string" ? firstItemPrice : firstItemPrice?.id ?? null;
    const currentPeriodEndSeconds = (liveBilling.subscription as { current_period_end?: number } | null)
      ?.current_period_end;
    const currentPeriodEnd = currentPeriodEndSeconds
      ? new Date(currentPeriodEndSeconds * 1000).toISOString()
      : null;
    const trialEndSeconds = (liveBilling.subscription as { trial_end?: number } | null)?.trial_end;
    const trialEnd = trialEndSeconds ? new Date(trialEndSeconds * 1000).toISOString() : null;
    const liveTier = getPlanTierFromPriceId(livePriceId ?? null);
    const liveTierName = liveTier === "essential_plus"
      ? "Essential Plus"
      : liveTier === "signature_pro"
        ? "Signature Pro"
        : null;

    if (isBlockingBillingStatus(liveStatus)) {
      return NextResponse.json(
        buildBlockingMessage({
          status: liveStatus,
          tierName: liveTierName,
          price: liveBilling.price,
          currentPeriodEnd,
          trialEnd,
        }),
      );
    }

    const isDevBillingState =
      process.env.NODE_ENV !== "production" &&
      typeof user.stripeSubscriptionId === "string" &&
      user.stripeSubscriptionId.startsWith("dev_sub_");
    if (isDevBillingState && isBlockingBillingStatus(user.stripeStatus)) {
      return NextResponse.json(
        buildStoredBlockingMessage({
          status: user.stripeStatus,
          stripePriceId: user.stripePriceId ?? null,
          currentPeriodEnd:
            user.stripeCurrentPeriodEnd instanceof Date
              ? user.stripeCurrentPeriodEnd.toISOString()
              : null,
          trialEnd:
            user.stripeCurrentPeriodEnd instanceof Date
              ? user.stripeCurrentPeriodEnd.toISOString()
              : null,
        }),
      );
    }

    return NextResponse.json({
      ok: true,
      requiresBillingAction: false,
    } satisfies DeleteBillingCheckResponse);
  } catch (error) {
    console.error("[account/delete/check] Failed to load live Stripe billing status", error);
    return NextResponse.json(
      { error: "We couldn’t verify your subscription with Stripe right now. Please try again." },
      { status: 503 }
    );
  }
}
