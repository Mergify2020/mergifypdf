import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

function getAppBaseUrl(req: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXTAUTH_URL
    || req.headers.get("origin")
    || req.nextUrl.origin
  );
}

function getAllowedOrigins(req: NextRequest) {
  const origins = new Set<string>();
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    req.headers.get("origin"),
    req.nextUrl.origin,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    origins.add(normalizeOrigin(candidate));
  }
  const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (forwardedHost) {
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    origins.add(`${proto}://${forwardedHost}`);
  }
  return origins;
}

function safeReturnUrl(req: NextRequest, candidate: unknown) {
  const fallback = getAppBaseUrl(req);
  if (typeof candidate !== "string" || !candidate) return fallback;
  try {
    const allowedOrigins = getAllowedOrigins(req);
    const url = new URL(candidate);
    if (allowedOrigins.has(normalizeOrigin(url.origin))) return url.toString();
    return fallback;
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
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

  const returnUrl = safeReturnUrl(req, (body as { returnUrl?: unknown } | null)?.returnUrl);

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
