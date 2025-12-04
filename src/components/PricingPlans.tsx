"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, X } from "lucide-react";

const tiers = [
  {
    name: "Starter Plan",
    price: "FREE",
    detail: "",
    description: "",
    pricePanel: "bg-white/80",
    features: [
      "1 document edit per day",
      "Store up to 3 projects",
      "Full document editing",
      "Self-sign documents",
    ],
  },
  {
    name: "Essential Plus",
    price: "$9.95 / Month",
    secondaryPrice: "$95 / Year — Save 20% Compared to Monthly",
    detail: "Per user / month",
    accent: "from-[#FFB480] to-[#FF8A4E]",
    overlay: "from-orange-300/30 to-transparent",
    button: "bg-[#FF8A4E]",
    pricePanel: "bg-white/80",
    description: "",
    features: [
      "Unlimited document uploads",
      "Unlimited project storage",
      "Full document editing",
      "Document templates",
      "Self-sign documents",
      "AI document tools",
    ],
  },
  {
    name: "Signature Pro",
    price: "$14.95 / Month",
    secondaryPrice: "$149 / Year — Save 20% Compared to Monthly",
    detail: "Per user / month",
    accent: "from-[#A9C7FF] via-[#7BA8F4] to-[#4D74C8]",
    overlay: "from-sky-200/25 to-transparent",
    button: "bg-[#4D74C8]",
    badge: "MOST POPULAR",
    description: "",
    pricePanel: "bg-white/80",
    features: [
      "Everything in Essential Plus",
      "Access to Mergify Sign dashboard",
      "10 signature requests per month",
      "Multiple signers per document",
      "Automatic email reminders",
      "Signer progress tracking",
    ],
  },
];

const faqs = [
  {
    question: "Can I upgrade at any time?",
    answer:
      "Yes. You can move between Personal, Team, or Business plans whenever you want. Your workspace updates instantly when you upgrade.",
  },
  {
    question: "How does seat-based billing work?",
    answer:
      "The Team plan includes up to 3 users. If your team grows, the Business plan adds extra seats for $4 per user per month.",
  },
  {
    question: "Do I need a credit card to get started?",
    answer:
      "No. Every account includes 1 free upload per day without payment. A credit card is only required if you choose to upgrade for unlimited usage.",
  },
  {
    question: "Can I add or remove teammates at any time?",
    answer: "Yes. Your seat count updates instantly, and your billing adjusts on your next cycle.",
  },
  {
    question: "Can I switch back to the free plan later?",
    answer:
      "Yes. If you cancel, you keep your paid features until your current billing period ends. After that, your account returns to the free tier with 1 upload per day.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "We don't provide refunds for partial billing cycles. If you cancel, you'll keep full access until the end of your paid period.",
  },
];

export default function PricingPlans() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const PRICE_IDS: Record<
    string,
    {
      monthly?: string;
      annual?: string;
    }
  > = {
    "Essential Plus": {
      monthly: "price_1Sa3MPJCQrZL3P2hvT5zgJxa",
      annual: "price_1Sa3NOJCQrZL3P2h4qkploLe",
    },
    "Signature Pro": {
      monthly: "price_1Sa3L6JCQrZL3P2hcbGBWN7P",
      annual: "price_1Sa3OSJCQrZL3P2hqw2zxi9w",
    },
  };

  async function handleSelectPlan(tierName: string) {
    if (tierName === "Starter Plan") {
      window.location.href = "/account?view=pricing";
      return;
    }

    const tierPrices = PRICE_IDS[tierName];
    const priceId = tierPrices?.[billingPeriod];

    if (!priceId) {
      console.error("Missing Stripe price ID for tier", tierName, "and period", billingPeriod);
      return;
    }

    try {
      setLoadingPlan(tierName);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/account?view=pricing";
        return;
      }

      if (!res.ok) {
        console.error("Failed to create checkout session", await res.text());
        return;
      }

      const data = (await res.json()) as { url?: string };
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error starting checkout", error);
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="pricing-gradient min-h-screen px-4 py-12 text-slate-900 lg:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-10 px-4 lg:px-6">
        <div className="text-center sm:flex sm:items-center sm:justify-between sm:text-left">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 drop-shadow-[0_10px_35px_rgba(15,23,42,0.4)]">
            Choose the workspace built for your workflow.
          </h1>
          <div className="mt-8 flex justify-center sm:mt-0 sm:justify-end">
            <div className="inline-flex items-center rounded-full bg-white p-1.5 text-sm font-semibold shadow-sm">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                className={`min-w-[112px] rounded-full px-5 py-2 whitespace-nowrap transition-colors ${
                  billingPeriod === "monthly"
                    ? "bg-black text-white shadow-sm ring-2 ring-sky-400"
                    : "text-slate-900 hover:text-slate-700 ring-0"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod("annual")}
                className={`min-w-[140px] rounded-full px-5 py-2 whitespace-nowrap transition-colors ${
                  billingPeriod === "annual"
                    ? "bg-black text-white shadow-sm ring-2 ring-sky-400"
                    : "text-slate-900 hover:text-slate-700 ring-0"
                }`}
              >
                Annual ·{" "}
                <span
                  className={`font-semibold ${
                    billingPeriod === "annual" ? "text-emerald-600" : "text-emerald-500"
                  }`}
                >
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 xl:grid-cols-3">
          {tiers.map((tier) => {
            const isPremium = Boolean(tier.badge);
            const isFree = tier.name === "Starter Plan";
            let yearlyPrice: string | null = null;
            let savingsLabel: string | null = null;

            if (tier.secondaryPrice) {
              const [year, savings] = tier.secondaryPrice.split("—");
              yearlyPrice = year?.trim() ?? null;
              const rawSavings = savings?.trim() ?? null;
              if (rawSavings) {
                const [mainPart] = rawSavings.split("Compared");
                savingsLabel = mainPart.trim().toUpperCase();
              }
            }

            const showAnnual = !isFree && billingPeriod === "annual" && yearlyPrice;

            const titleClass =
              tier.name === "Starter Plan"
                ? "text-[2rem] md:text-[1.9rem] font-bold leading-snug text-[#6B7280]"
                : tier.name === "Essential Plus"
                  ? "text-[2.2rem] md:text-[2.1rem] font-bold leading-snug bg-gradient-to-r from-sky-500 to-emerald-400 bg-clip-text text-transparent"
                  : "text-[2.2rem] md:text-[2.1rem] font-bold leading-snug bg-gradient-to-r from-purple-500 to-sky-500 bg-clip-text text-transparent";

            return (
	              <div
	                key={tier.name}
	                className={`frosted-card flex h-full flex-col overflow-hidden rounded-[24px] px-8 py-6 transition-transform duration-150 ${
	                  isPremium ? "ring-1 ring-purple-200/60" : ""
	                }`}
	              >
                <div className="relative z-10 flex h-full flex-col">
	                  <div
	                    className={`relative h-[220px] overflow-hidden rounded-[20px] border border-white/50 bg-white/75 px-6 py-4 text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md ${
	                      isPremium ? "ring-1 ring-white/60" : ""
	                    }`}
	                  >
                    <div className="relative z-10">
                      <div className="mb-3 flex h-7 items-center">
                        {tier.badge ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-md">
                            <span className="h-2 w-2 rounded-full bg-white/90" />
                            {tier.badge}
                          </span>
                        ) : null}
                      </div>
                      <div className="pt-1">
                        <h2 className={titleClass}>
                          {tier.name}
                        </h2>
		                          <div className="mt-6">
	                            <div className="flex items-baseline gap-2">
		                              <p className="whitespace-nowrap text-[2.3rem] md:text-4xl font-semibold leading-tight text-slate-900">
	                                {showAnnual ? yearlyPrice : tier.price}
	                              </p>
	                            </div>
	                            <div className="mt-1 flex h-5 items-center gap-2">
	                              {!isFree && billingPeriod === "annual" && savingsLabel ? (
	                                <>
	                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
	                                    {savingsLabel}
	                                  </span>
	                                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
	                                    Compared to monthly
	                                  </span>
	                                </>
	                              ) : null}
	                            </div>
	                          {isFree && tier.detail ? (
	                            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-600">
	                              {tier.detail}
	                            </p>
	                          ) : null}
	                          {tier.description ? (
	                            <p className="mt-3 text-sm leading-snug text-slate-700">{tier.description}</p>
	                          ) : null}
	                        </div>
	                      </div>
                    </div>
                  </div>
                  <ul className="mt-4 flex-1 space-y-3 text-sm text-slate-800">
                    {tier.features.map((feature) => {
                      if (isPremium && feature === "Everything in Basic") return null;
                      return (
                        <li key={feature} className="flex items-center gap-2">
	                          <span
	                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm"
	                          >
	                              <div
	                                className={`h-1 w-3 rounded-full ${
	                                  tier.name === "Starter Plan"
	                                    ? "bg-[#9CA3AF]"
	                                    : tier.name === "Essential Plus"
	                                      ? "bg-sky-500"
	                                      : "bg-indigo-500"
	                                }`}
	                              />
                          </span>
	                          {tier.name === "Signature Pro" && feature === "Everything in Essential Plus" ? (
	                            <span className="inline-flex items-center rounded-full bg-white px-3 py-1">
	                              <span className="bg-gradient-to-r from-sky-500 to-emerald-400 bg-clip-text text-sm font-semibold text-transparent">
	                                {feature}
	                              </span>
	                            </span>
		                          ) : (
		                            <span className="font-semibold text-slate-900">{feature}</span>
		                          )}
                        </li>
                      );
                    })}
                  </ul>
	                  <button
	                    type="button"
	                    disabled={loadingPlan === tier.name}
	                    onClick={() => void handleSelectPlan(tier.name)}
	                    className={`mt-6 w-full rounded-full border-4 border-white/90 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-150 ${
	                      isFree
	                        ? "border-transparent bg-[#374151]"
	                        : isPremium
	                          ? "bg-gradient-to-r from-purple-500 to-sky-500 hover:scale-[1.01]"
	                          : tier.name === "Essential Plus"
	                            ? "bg-gradient-to-r from-sky-500 to-emerald-400 hover:scale-[1.01]"
	                            : "bg-black"
	                    } ${loadingPlan === tier.name ? "opacity-70 cursor-not-allowed" : ""}`}
	                  >
                    {loadingPlan === tier.name ? "Redirecting..." : "Select Plan"}
	                  </button>
                </div>
              </div>
            );
          })}
        </div>

	        <div className="mt-16 frosted-card rounded-[40px] p-6 text-sm text-slate-900 lg:p-8">
	          <p className="mb-6 text-center text-3xl font-semibold tracking-tight text-slate-900">Compare Our Plans</p>
          <div className="overflow-hidden rounded-3xl bg-white/75 shadow-inner">
            <table className="mx-auto w-full table-fixed text-xs sm:text-sm text-slate-800">
              <thead className="bg-black text-[10px] sm:text-sm font-semibold text-white text-center sm:text-left">
                <tr>
                  <th className="hidden px-5 py-4 text-left text-[11px] sm:text-base font-semibold text-white sm:table-cell">
                    Features
                  </th>
                  <th className="w-1/3 px-3 py-4 text-center text-[11px] sm:w-auto sm:text-base font-bold tracking-normal text-white">
                    <span className="block sm:inline">Starter</span>{" "}
                    <span className="block sm:inline">Plan</span>
                  </th>
                  <th className="w-1/3 px-3 py-4 text-center text-[11px] sm:w-auto sm:text-base font-bold tracking-normal text-white">
                    <span className="block sm:inline">Essential</span>{" "}
                    <span className="block sm:inline">Plus</span>
                  </th>
                  <th className="w-1/3 px-3 py-4 text-center text-[11px] sm:w-auto sm:text-base font-bold tracking-normal text-white">
                    <span className="block sm:inline">Signature</span>{" "}
                    <span className="block sm:inline">Pro</span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {[
                  { feature: "Daily Uploads", basic: "1 Per Day", pro: "Unlimited", business: "Unlimited" },
                  { feature: "Project Storage", basic: "5 Documents", pro: "Unlimited", business: "Unlimited" },
                  { feature: "Document Editing", basic: true, pro: true, business: true },
                  { feature: "Self-Sign Documents", basic: true, pro: true, business: true },
                  { feature: "Templates", basic: false, pro: true, business: true },
                  { feature: "AI Document Tools", basic: false, pro: true, business: true },
                  { feature: "Access to Mergify Sign", basic: false, pro: false, business: true },
                  { feature: "Signature Tracking", basic: false, pro: false, business: true },
                  { feature: "Outgoing Signature Requests", basic: false, pro: false, business: "10 Per Month" },
                ].map((row) => (
                  <>
                    <tr key={`${row.feature}-label`} className="sm:hidden">
                      <td
                        colSpan={4}
                        className="px-3 pt-2 pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {row.feature}
                      </td>
                    </tr>
                    <tr
                      key={`${row.feature}-values`}
                      className="text-center sm:text-left border-b border-slate-200 sm:last:border-0"
                    >
                      <td className="hidden px-5 py-5 text-xs sm:text-sm font-semibold text-slate-900 sm:table-cell">
                        {row.feature}
                      </td>
                      <td className="w-1/3 px-3 py-3 sm:py-5 text-center text-xs sm:w-auto sm:text-sm font-semibold text-slate-900">
                        {renderValue((row as any).basic)}
                      </td>
                      <td className="w-1/3 px-3 py-3 sm:py-5 text-center text-xs sm:w-auto sm:text-sm font-semibold text-slate-900">
                        {renderValue((row as any).pro)}
                      </td>
                      <td className="w-1/3 px-3 py-3 sm:py-5 text-center text-xs sm:w-auto sm:text-sm font-semibold text-slate-900">
                        {renderValue((row as any).business)}
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

	        <div className="frosted-card rounded-[46px] p-8 text-slate-900">
	          <p className="mb-8 text-center text-3xl font-semibold tracking-tight text-slate-900">
	            Frequently Asked Questions
	          </p>
          <div className="grid gap-6 text-left md:grid-cols-2">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-3xl bg-white/75 p-6 text-slate-900 shadow-inner"
              >
                <h3 className="text-base font-semibold text-slate-900">{faq.question}</h3>
                <p className="mt-3 text-sm text-slate-700">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function renderValue(value: boolean | string) {
  if (typeof value === "string") {
    if (value === "Unlimited") {
      return (
        <span className="block bg-gradient-to-r from-purple-600 to-blue-700 bg-clip-text text-center font-semibold text-transparent">
          {value}
        </span>
      );
    }
    return <span className="block text-center text-slate-900">{value}</span>;
  }
  if (value) {
    return (
      <span className="flex justify-center">
        <Check className="h-6 w-6 text-emerald-500" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="flex justify-center">
      <X className="h-6 w-6 text-rose-500" strokeWidth={3} />
    </span>
  );
}
