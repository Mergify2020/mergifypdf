'use client';

import { useState } from 'react';
import PricingTierCards from '@/components/PricingTierCards';
import { BILLING_PRICE_IDS, FREE_TRIAL_DAYS } from '@/lib/billingPlans';

export default function LandingPricingCards() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const billingPeriod = 'monthly' as const;

  const PRICE_IDS: Record<string, { monthly?: string }> = {
    'Essential Plus': {
      monthly: BILLING_PRICE_IDS.essential_plus.monthly,
    },
    'Signature Pro': {
      monthly: BILLING_PRICE_IDS.signature_pro.monthly,
    },
  };

  function canUseTrialForPlan() {
    return true;
  }

  async function handleSelectPlan(tierName: string, options?: { skipTrial?: boolean }) {
    const tierPrices = PRICE_IDS[tierName];
    const priceId = tierPrices?.[billingPeriod];

    if (!priceId) {
      console.error('Missing Stripe price ID for tier', tierName);
      return;
    }

    try {
      setLoadingPlan(tierName);
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, skipTrial: options?.skipTrial === true }),
      });

      if (res.status === 401) {
        window.location.href = '/login?callbackUrl=/pricing';
        return;
      }

      if (!res.ok) {
        console.error('Failed to create checkout session', await res.text());
        return;
      }

      const data = (await res.json()) as { url?: string };
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error starting checkout', error);
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <PricingTierCards
      billingPeriod={billingPeriod}
      canUseTrialForPlan={canUseTrialForPlan}
      getPrimaryActionLabel={(_, canUseTrial) => (canUseTrial ? `Start ${FREE_TRIAL_DAYS}-day trial` : 'Subscribe now')}
      getPrimaryActionOptions={(_, canUseTrial) => (canUseTrial ? undefined : { skipTrial: true })}
      onPrimaryAction={(tierName, options) => {
        void handleSelectPlan(tierName, options);
      }}
      getSecondaryActionLabel={(_, canUseTrial) => (canUseTrial ? 'Pay now' : null)}
      onSecondaryAction={(tierName) => {
        void handleSelectPlan(tierName, { skipTrial: true });
      }}
      loadingPlan={loadingPlan}
      tone="dark"
      primaryActionClassName="bg-[#6D5EF3] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_18px_rgba(109,94,243,0.24)] ring-1 ring-white/20 hover:-translate-y-0.5 hover:bg-[#7A6AF5]"
      className="grid w-full gap-10 md:grid-cols-2"
    />
  );
}
