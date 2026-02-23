import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { getPlanTierFromPriceId, getTrialEligibilityForUser } from "@/lib/billingPlans";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({
      authenticated: false,
      trialUsedAt: null,
      eligibleForTrial: true,
      eligibleForTrialByPlan: {
        essentialPlus: true,
        signaturePro: true,
      },
      trialUsageByPlan: {
        essentialPlus: false,
        signaturePro: false,
      },
      hasActivePlan: false,
      stripeStatus: null,
      currentPlanTier: null,
      stripeCustomerId: null,
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      trialUsedAt: true,
      essentialPlusTrialUsedAt: true,
      signatureProTrialUsedAt: true,
      stripeStatus: true,
      stripePriceId: true,
      stripeCustomerId: true,
    },
  });
  const hasActivePlan = user?.stripeStatus === "active" || user?.stripeStatus === "trialing";
  const trialEligibility = getTrialEligibilityForUser({
    essentialPlusTrialUsedAt: user?.essentialPlusTrialUsedAt,
    signatureProTrialUsedAt: user?.signatureProTrialUsedAt,
    legacyTrialUsedAt: user?.trialUsedAt,
  });
  const currentPlanTier = getPlanTierFromPriceId(user?.stripePriceId ?? null);

  return NextResponse.json({
    authenticated: true,
    trialUsedAt: user?.trialUsedAt ?? null,
    essentialPlusTrialUsedAt: user?.essentialPlusTrialUsedAt ?? null,
    signatureProTrialUsedAt: user?.signatureProTrialUsedAt ?? null,
    eligibleForTrial: trialEligibility.eligibleForAnyTrial,
    eligibleForTrialByPlan: trialEligibility.eligibleForTrialByPlan,
    trialUsageByPlan: {
      essentialPlus: trialEligibility.hasUsedEssentialPlusTrial,
      signaturePro: trialEligibility.hasUsedSignatureProTrial,
    },
    hasActivePlan,
    stripeStatus: user?.stripeStatus ?? null,
    currentPlanTier,
    stripeCustomerId: user?.stripeCustomerId ?? null,
  });
}
