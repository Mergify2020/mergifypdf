"use client";

import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from "lucide-react";
import RevealOnScroll from "@/components/RevealOnScroll";

export type BillingPeriod = "monthly" | "annual";

export type PricingTier = {
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  annualSavings: string;
  features: string[];
  featured?: boolean;
};

export const PRICING_TIERS = [
  {
    name: "Essential Plus",
    monthlyPrice: "$12.99 per month",
    annualPrice: "$7.99 per month",
    annualSavings: "SAVE 42%",
    features: [
      "Unlimited uploads & projects",
      "Advanced PDF editing",
      "Sign your own documents",
      "Create reusable templates",
      "Compress & optimize PDFs",
      "Secure cloud storage",
      "Fast, reliable processing",
    ],
  },
  {
    name: "Signature Pro",
    monthlyPrice: "$19.99 per month",
    annualPrice: "$11.99 per month",
    annualSavings: "SAVE 37%",
    features: [
      "Everything in Essential Plus",
      "Unlimited signature requests",
      "Dedicated signature dashboard",
      "Multiple signers per document",
      "Automatic signing reminders",
      "Real-time signing progress tracking",
      "Complete signing activity history",
    ],
    featured: true,
  },
] as const satisfies readonly PricingTier[];

type PricingTierCardsProps = {
  billingPeriod: BillingPeriod;
  canUseTrialForPlan: (tierName: string) => boolean;
  currentPlanTier?: string | null;
  currentPlanBillingPeriod?: BillingPeriod | null;
  getPrimaryActionLabel: (tierName: string, canUseTrial: boolean) => string;
  getPrimaryActionOptions?: (
    tierName: string,
    canUseTrial: boolean
  ) => { skipTrial?: boolean } | undefined;
  onPrimaryAction: (tierName: string, options?: { skipTrial?: boolean }) => void;
  onPortalAction?: (tierName: string) => void;
  getSecondaryActionLabel?: (tierName: string, canUseTrial: boolean) => string | null;
  onSecondaryAction?: (tierName: string) => void;
  loadingPlan?: string | null;
  className?: string;
};

export default function PricingTierCards({
  billingPeriod,
  canUseTrialForPlan,
  currentPlanTier,
  currentPlanBillingPeriod,
  getPrimaryActionLabel,
  getPrimaryActionOptions,
  onPrimaryAction,
  onPortalAction,
  getSecondaryActionLabel,
  onSecondaryAction,
  loadingPlan,
  className = "grid w-full gap-10 md:grid-cols-2",
}: PricingTierCardsProps) {
  return (
    <div className={className}>
      {PRICING_TIERS.map((tier, index) => {
        const canUseTrial = canUseTrialForPlan(tier.name);
        const hasActiveSubscription = !!currentPlanTier && !!currentPlanBillingPeriod;
        const isCurrentPlan =
          hasActiveSubscription &&
          currentPlanTier === tier.name &&
          currentPlanBillingPeriod === billingPeriod;
        const isSameTierDifferentCycle =
          hasActiveSubscription &&
          currentPlanTier === tier.name &&
          currentPlanBillingPeriod !== billingPeriod;
        const isCrossTierPlan = hasActiveSubscription && currentPlanTier !== tier.name;
        const isDowngradeAction = currentPlanTier === "Signature Pro" && tier.name === "Essential Plus";
        const displayedPrice = billingPeriod === "annual" ? tier.annualPrice : tier.monthlyPrice;
        const [priceAmount, priceSuffix] = displayedPrice.split(" per ");
        const isLoading = loadingPlan === tier.name;
        const primaryActionLabel = isCurrentPlan
          ? "Current plan"
          : isSameTierDifferentCycle
            ? billingPeriod === "annual"
              ? "Switch to annual"
              : "Switch to monthly"
            : isCrossTierPlan
              ? currentPlanTier === "Essential Plus"
                ? "Upgrade to Pro"
                : "Downgrade to Essential Plus"
              : getPrimaryActionLabel(tier.name, canUseTrial);
        const secondaryActionLabel = hasActiveSubscription
          ? null
          : getSecondaryActionLabel?.(tier.name, canUseTrial) ?? null;
        const primaryActionOptions = getPrimaryActionOptions?.(tier.name, canUseTrial);
        const titleClass =
          tier.name === "Essential Plus"
            ? "text-[2rem] font-bold leading-tight tracking-tight bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-400 bg-clip-text text-transparent md:text-[2.25rem]"
            : "text-[2rem] font-bold leading-tight tracking-tight bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent md:text-[2.25rem]";

        return (
          <RevealOnScroll key={tier.name} as="div" delayMs={index * 80} className="h-full">
            <div className="group relative h-full w-full overflow-visible">
              <div
                className={`relative z-10 flex h-full flex-col overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)] dark:border-[#4B4B4B] dark:bg-[#262626] dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] dark:hover:shadow-[0_14px_28px_rgba(0,0,0,0.34)]`}
              >
                <div className="relative z-10 flex h-full flex-col px-6 pt-5 pb-6">
                  <div className="relative z-10">
                    <div className="pt-0.5">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h2 className={titleClass}>{tier.name}</h2>
                        {tier.name === "Signature Pro" ? (
                          <span className="mt-2 hidden shrink-0 items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 md:inline-flex dark:bg-[#3A3A3A] dark:text-zinc-200">
                            Most popular
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-5">
                        <div className="flex items-center gap-2">
                          <p
                            key={displayedPrice}
                            className="price-swap whitespace-nowrap text-[2.6rem] font-normal leading-tight tracking-tight text-slate-900 md:text-[3rem] dark:text-zinc-100"
                          >
                            {priceAmount}
                          </p>
                          {priceSuffix ? (
                            <span key={priceSuffix} className="price-swap text-base font-medium text-slate-500 dark:text-zinc-400">
                              per {priceSuffix}
                            </span>
                          ) : null}
                        </div>
                        <div className={`mt-0.5 ${billingPeriod === "annual" ? "h-3" : "h-0"}`} />
                        <div
                          className={`flex items-center gap-2 transition-all duration-200 ${
                            billingPeriod === "annual"
                              ? "mt-0 translate-y-0 opacity-100"
                              : "pointer-events-none mt-[-10px] translate-y-1 opacity-0"
                          }`}
                        >
                          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Billed annually</p>
                          {billingPeriod === "annual" ? (
                            <span className="rounded-full bg-purple-500 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white dark:bg-purple-400 dark:text-[#1A1333]">
                              {tier.annualSavings}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isLoading || isCurrentPlan}
                    onClick={() => {
                      if (isCurrentPlan) return;
                      if (hasActiveSubscription) {
                        onPortalAction?.(tier.name);
                        return;
                      }
                      onPrimaryAction(tier.name, primaryActionOptions);
                    }}
                    className={`${
                      billingPeriod === "monthly" ? "mt-4" : "mt-5"
                    } w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 ${
                      isCurrentPlan
                        ? "cursor-not-allowed bg-emerald-500 text-white shadow-none"
                        : "bg-slate-900 text-white hover:-translate-y-px hover:bg-slate-800 dark:border dark:border-[#4A4A4A] dark:bg-[#3A3A3A] dark:text-zinc-100 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_6px_14px_rgba(0,0,0,0.22)] dark:hover:bg-[#444444]"
                    } ${isLoading ? "cursor-not-allowed opacity-70" : isCurrentPlan ? "cursor-not-allowed" : ""}`}
                  >
                    {isCurrentPlan ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                        {primaryActionLabel}
                      </span>
                    ) : isLoading ? (
                      "Redirecting..."
                    ) : (
                      <span className="inline-flex items-center justify-center gap-2">
                        {isDowngradeAction ? (
                          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                        ) : null}
                        <span>{primaryActionLabel}</span>
                        {!isDowngradeAction ? (
                          <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                        ) : null}
                      </span>
                    )}
                  </button>
                  {secondaryActionLabel && onSecondaryAction ? (
                    <div className="mt-3 flex flex-col items-center gap-2 text-xs font-medium text-slate-900/80 dark:text-zinc-200/80">
                      <button
                        type="button"
                        onClick={() => onSecondaryAction(tier.name)}
                        className="text-xs font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white"
                      >
                        {secondaryActionLabel}
                      </button>
                    </div>
                  ) : null}
                  <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-800 dark:text-zinc-200">
                    {tier.features.map((feature) => {
                      return (
                        <li key={feature} className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-5 w-5 flex-none items-center justify-center rounded-full ${
                              tier.name === "Essential Plus" ? "bg-sky-500 dark:bg-sky-400" : "bg-indigo-500 dark:bg-violet-500"
                            }`}
                          >
                            <Check className="h-3 w-3 text-white" strokeWidth={2.5} aria-hidden="true" />
                          </span>
                          <span className="font-medium leading-5 text-slate-900 dark:text-zinc-100">{feature}</span>
                        </li>
                      );
                    })}
                  </ul>
                  {tier.name === "Signature Pro" ? (
                    <p className="mt-0 flex w-full items-baseline justify-start gap-1 pl-7 text-xs leading-5 text-slate-500 dark:text-zinc-400">
                      <span className="text-rose-500/90" aria-hidden="true">
                        *
                      </span>
                      <span>Signers do not need a paid plan.</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </RevealOnScroll>
        );
      })}
    </div>
  );
}
