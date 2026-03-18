import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import {
  clearPrismaDatabaseUnavailable,
  isPrismaDatabaseCooldownActive,
  markPrismaDatabaseUnavailable,
  prisma,
} from "@/lib/prisma";
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

  let user:
    | {
        trialUsedAt: Date | null;
        essentialPlusTrialUsedAt: Date | null;
        signatureProTrialUsedAt: Date | null;
        stripeStatus: string | null;
        stripePriceId: string | null;
        stripeCustomerId: string | null;
      }
    | null = null;

  try {
    if (!isPrismaDatabaseCooldownActive()) {
      user = await prisma.user.findUnique({
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
      clearPrismaDatabaseUnavailable();
    }
  } catch (error) {
    markPrismaDatabaseUnavailable(error);
    if (process.env.NODE_ENV === "production") {
      console.error("[account/trial-status] Failed to load billing state; returning fallback.");
    } else {
      console.warn("[account/trial-status] Failed to load billing state; returning fallback.");
    }

    return NextResponse.json({
      authenticated: true,
      trialUsedAt: null,
      essentialPlusTrialUsedAt: null,
      signatureProTrialUsedAt: null,
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
