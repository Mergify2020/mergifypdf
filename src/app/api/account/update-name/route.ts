import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestGuards";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
  }
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName.length > 120) {
    return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: fullName.length > 0 ? fullName : null },
    select: { stripeCustomerId: true },
  });

  if (updatedUser.stripeCustomerId) {
    try {
      const stripe = getStripe();
      await stripe.customers.update(updatedUser.stripeCustomerId, {
        name: fullName,
      });
    } catch (error) {
      console.error("[account.update-name] Failed to update Stripe customer name", error);
    }
  }

  return NextResponse.json({ success: true, name: fullName.length > 0 ? fullName : null });
}
