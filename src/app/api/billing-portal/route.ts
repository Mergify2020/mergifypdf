import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestGuards";

function safeReturnUrl(origin: string, candidate: unknown) {
  if (typeof candidate !== "string" || !candidate) return origin;
  try {
    const url = new URL(candidate);
    if (url.origin !== origin) return origin;
    return url.toString();
  } catch {
    return origin;
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const stripe = getStripe();
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userId = session?.user?.id ?? null;

  if (!email || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const origin = req.nextUrl.origin;
  const returnUrl = safeReturnUrl(origin, (body as { returnUrl?: unknown } | null)?.returnUrl);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, email: true, name: true },
    });

    let customerId = user?.stripeCustomerId ?? null;

    if (!customerId) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      const customer =
        existing.data[0] ??
        (await stripe.customers.create({
          email: user?.email ?? email,
          name: user?.name ?? session?.user?.name ?? undefined,
        }));
      customerId = customer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating Stripe Billing Portal session", error);
    return NextResponse.json({ error: "Stripe billing portal error" }, { status: 500 });
  }
}
