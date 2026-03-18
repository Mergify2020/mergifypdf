import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

type EnsureStripeCustomerInput = {
  userId: string;
  email: string;
  name?: string | null;
  stripeCustomerId?: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function pickStripeCustomerByEmail(
  stripe: Stripe,
  email: string,
  userId: string,
): Promise<string | null> {
  const customers = await stripe.customers.list({ email, limit: 100 });
  const exactMatches = customers.data.filter((customer) => {
    if (customer.deleted) return false;
    return normalizeEmail(customer.email ?? "") === email;
  });

  if (exactMatches.length === 0) {
    return null;
  }

  const alreadyLinked = exactMatches.find((customer) => customer.metadata?.appUserId === userId);
  if (alreadyLinked) {
    return alreadyLinked.id;
  }
  return null;
}

export async function resolveStripeCustomerIdForUser(input: EnsureStripeCustomerInput): Promise<string> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error("Cannot create Stripe customer without email");
  }

  const stripe = getStripe();
  let customerId = input.stripeCustomerId ?? null;

  if (!customerId) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { stripeCustomerId: true },
    });
    customerId = user?.stripeCustomerId ?? null;
  }

  if (!customerId) {
    customerId = await pickStripeCustomerByEmail(stripe, email, input.userId);
  }

  if (!customerId) {
    const created = await stripe.customers.create({
      email,
      name: input.name ?? undefined,
      metadata: { appUserId: input.userId },
    });
    customerId = created.id;
  } else {
    await stripe.customers.update(customerId, {
      email,
      name: input.name ?? undefined,
      metadata: { appUserId: input.userId },
    });
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: { stripeCustomerId: customerId },
  });

  return customerId;
}

export async function ensureStripeCustomerForUser(input: EnsureStripeCustomerInput): Promise<string> {
  return resolveStripeCustomerIdForUser(input);
}
