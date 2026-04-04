import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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
  const [{ authOptions }, { resolveStripeCustomerIdForUser }, { getStripe }] = await Promise.all([
    import("@/lib/authOptions"),
    import("@/lib/stripeCustomers"),
    import("@/lib/stripe"),
  ]);
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
    const targetEmail = (user?.email ?? email).trim().toLowerCase();
    const targetName = user?.name ?? session?.user?.name ?? undefined;

    const customerId = await resolveStripeCustomerIdForUser({
      userId,
      email: targetEmail,
      name: targetName,
      stripeCustomerId: user?.stripeCustomerId ?? null,
    });

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
