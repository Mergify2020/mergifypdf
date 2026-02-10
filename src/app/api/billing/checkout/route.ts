import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getStripe } from "@/lib/stripe";
import { isSameOrigin } from "@/lib/requestGuards";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const stripe = getStripe();
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  try {
    const origin = req.nextUrl.origin;
    const successUrl = `${origin}/pricing?status=success`;
    const cancelUrl = `${origin}/pricing?canceled=true`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: session.user.email ?? undefined,
      allow_promotion_codes: true,
      subscription_data:
        skipTrial === true
          ? undefined
          : {
              trial_period_days: 3,
            },
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "No checkout URL returned from Stripe" }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating Stripe Checkout Session", error);
    return NextResponse.json({ error: "Stripe checkout error" }, { status: 500 });
  }
}
