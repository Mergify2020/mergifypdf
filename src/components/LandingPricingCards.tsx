'use client';

import PricingTierCards from '@/components/PricingTierCards';

export default function LandingPricingCards() {
  const billingPeriod = 'monthly' as const;

  function canUseTrialForPlan() {
    return false;
  }

  function getPlanTierFromName(tierName: string) {
    if (tierName === 'Essential Plus') return 'essential_plus';
    if (tierName === 'Signature Pro') return 'signature_pro';
    return null;
  }

  function handleSelectPlan(tierName: string) {
    const planTier = getPlanTierFromName(tierName);
    if (!planTier) {
      window.location.href = '/register';
      return;
    }
    const params = new URLSearchParams({ plan: planTier, billing: billingPeriod });
    window.location.href = '/register?' + params.toString();
  }

  return (
    <PricingTierCards
      billingPeriod={billingPeriod}
      canUseTrialForPlan={canUseTrialForPlan}
      getPrimaryActionLabel={() => 'Select Plan'}
      getPrimaryActionOptions={() => ({ skipTrial: true })}
      onPrimaryAction={(tierName) => {
        handleSelectPlan(tierName);
      }}
      tone="dark"
      primaryActionClassName="bg-[#6D5EF3] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_18px_rgba(109,94,243,0.24)] ring-1 ring-white/20 hover:-translate-y-0.5 hover:bg-[#7A6AF5]"
      className="grid w-full gap-10 md:grid-cols-2"
    />
  );
}
