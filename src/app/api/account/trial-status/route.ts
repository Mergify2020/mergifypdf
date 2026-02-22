import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({
      authenticated: false,
      trialUsedAt: null,
      eligibleForTrial: true,
      hasActivePlan: false,
      stripeStatus: null,
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { trialUsedAt: true, stripeStatus: true },
  });
  const hasActivePlan = user?.stripeStatus === "active" || user?.stripeStatus === "trialing";

  return NextResponse.json({
    authenticated: true,
    trialUsedAt: user?.trialUsedAt ?? null,
    eligibleForTrial: !user?.trialUsedAt,
    hasActivePlan,
    stripeStatus: user?.stripeStatus ?? null,
  });
}
