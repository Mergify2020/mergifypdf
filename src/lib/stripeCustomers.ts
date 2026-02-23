import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

type EnsureStripeCustomerInput = {
  userId: string;
  email: string;
  name?: string | null;
  stripeCustomerId?: string | null;
};

export async function ensureStripeCustomerForUser(input: EnsureStripeCustomerInput): Promise<string> {
  const email = input.email.trim().toLowerCase();
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
