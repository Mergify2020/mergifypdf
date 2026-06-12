export type BillingPlanTier = "essential_plus" | "signature_pro";
export type BillingStatusPresentation = "none" | "active" | "trialing" | "past_due" | "unpaid";

export const BILLING_PRICE_IDS: Record<BillingPlanTier, { monthly: string; annual: string }> = {
  essential_plus: {
    monthly: "price_1T3SEvJCQrZL3P2hfpX6i8qx",
    annual: "price_1T3SGJJCQrZL3P2h1rkd9yRY",
  },
  signature_pro: {
    monthly: "price_1T3SH0JCQrZL3P2hoyT8N2yN",
    annual: "price_1T3SI2JCQrZL3P2hchDkvXBd",
  },
};

export const ALLOWED_PRICE_IDS = new Set<string>(
  Object.values(BILLING_PRICE_IDS).flatMap((plan) => [plan.monthly, plan.annual]),
);

const PRICE_ID_TO_TIER: Record<string, BillingPlanTier> = Object.entries(BILLING_PRICE_IDS).reduce(
  (acc, [tier, prices]) => {
    acc[prices.monthly] = tier as BillingPlanTier;
    acc[prices.annual] = tier as BillingPlanTier;
    return acc;
  },
  {} as Record<string, BillingPlanTier>,
);

export function getPlanTierFromPriceId(priceId: string | null | undefined): BillingPlanTier | null {
  if (!priceId) return null;
  return PRICE_ID_TO_TIER[priceId] ?? null;
}

export function getBillingStatusPresentation(
  status: string | null | undefined,
): BillingStatusPresentation {
  if (
    status === "active"
    || status === "trialing"
    || status === "past_due"
    || status === "unpaid"
  ) {
    return status;
  }
  return "none";
}

type TrialUsageInput = {
  essentialPlusTrialUsedAt?: Date | null;
  signatureProTrialUsedAt?: Date | null;
  // Legacy global flag kept for backward compatibility while old rows are migrated.
  legacyTrialUsedAt?: Date | null;
};

export function getTrialEligibilityForUser(input: TrialUsageInput) {
  const essentialPlusTrialUsedAt = input.essentialPlusTrialUsedAt ?? null;
  const signatureProTrialUsedAt = input.signatureProTrialUsedAt ?? null;
  const legacyTrialUsedAt = input.legacyTrialUsedAt ?? null;

  // Legacy rows only had one flag. We treat those as no further trial eligibility
  // to avoid unintentionally granting extra trials after policy rollout.
  const hasLegacyUnknownTrial =
    !essentialPlusTrialUsedAt && !signatureProTrialUsedAt && !!legacyTrialUsedAt;

  const hasUsedEssentialPlusTrial = !!essentialPlusTrialUsedAt;
  const hasUsedSignatureProTrial = !!signatureProTrialUsedAt || hasLegacyUnknownTrial;

  const eligibleForEssentialPlusTrial = !hasUsedEssentialPlusTrial && !hasUsedSignatureProTrial;
  const eligibleForSignatureProTrial = !hasUsedSignatureProTrial;

  return {
    eligibleForTrialByPlan: {
      essentialPlus: eligibleForEssentialPlusTrial,
      signaturePro: eligibleForSignatureProTrial,
    },
    eligibleForAnyTrial: eligibleForEssentialPlusTrial || eligibleForSignatureProTrial,
    hasUsedEssentialPlusTrial,
    hasUsedSignatureProTrial,
  };
}
