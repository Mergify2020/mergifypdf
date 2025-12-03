"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, X } from "lucide-react";

const tiers = [
  {
    name: "Starter Plan",
    price: "$0",
    detail: "Current plan",
    description: "",
    pricePanel: "bg-white/80",
    features: [
      "1 PDF upload per day",
      "Basic editing tools",
      "Self-sign documents",
      "Email support",
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
      "Unlimited PDF uploads",
      "Unlimited edits + merges",
      "Highlight & drawing tools",
      "Upload and self-sign documents",
      "Mobile signature capture (QR)",
      "Cloud saves & resume project",
      "Standard support",
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
      "Everything in Basic",
      "Send documents for signature",
      "10 signature requests per month",
      "Signature tracking (opened, viewed, signed)",
      "Audit log of signing events",
      "Branded emails (Your name via MergifyPDF)",
      "Automatic email reminders",
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

  return (
    <div className="pricing-gradient min-h-screen px-4 py-12 text-slate-900 lg:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-10 px-4 lg:px-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 drop-shadow-[0_10px_35px_rgba(15,23,42,0.4)]">
            Choose the workspace built for your workflow.
          </h1>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center rounded-full bg-white p-1.5 text-sm font-semibold shadow-sm">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                className={`min-w-[112px] rounded-full px-5 py-2 transition-colors ${
                  billingPeriod === "monthly"
                    ? "bg-black text-white shadow-sm"
                    : "text-slate-900 hover:text-slate-700"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod("annual")}
                className={`min-w-[140px] rounded-full px-5 py-2 transition-colors ${
                  billingPeriod === "annual"
                    ? "bg-black text-white shadow-sm"
                    : "text-slate-900 hover:text-slate-700"
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
                ? "text-[2rem] md:text-[1.9rem] font-bold leading-snug text-slate-900"
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
	                          {isFree ? (
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
                    {isPremium ? (
                      <li className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                        Everything in Basic, plus:
                      </li>
                    ) : null}
                    {tier.features.map((feature) => {
                      if (isPremium && feature === "Everything in Basic") return null;
                      return (
                        <li key={feature} className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                              isPremium ? "bg-white/40" : "bg-white/20"
                            }`}
                          >
                            <div
                              className={`h-1 w-3 rounded-full ${
                                isPremium ? "bg-indigo-500" : "bg-slate-500"
                              }`}
                            />
                          </span>
                          <span className="font-semibold text-slate-900">{feature}</span>
                        </li>
                      );
                    })}
                  </ul>
		                  <button
		                    type="button"
		                    disabled
		                    className={`pointer-events-none mt-6 w-full rounded-full border-4 border-white/90 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-150 ${
		                      isFree
		                        ? "border-transparent bg-emerald-500"
		                        : isPremium
		                          ? "bg-gradient-to-r from-purple-500 to-sky-500 hover:scale-[1.01]"
		                          : tier.name === "Essential Plus"
		                            ? "bg-gradient-to-r from-sky-500 to-emerald-400 hover:scale-[1.01]"
		                            : "bg-black"
		                    }`}
		                  >
                    {isFree ? "Current plan" : "Upgrade"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 frosted-card rounded-[40px] p-6 text-sm text-slate-900 lg:p-8">
          <p className="mb-6 text-center text-3xl font-semibold tracking-tight text-slate-900">Compare plans</p>
          <div className="overflow-hidden rounded-3xl bg-white/75 shadow-inner">
            <table className="mx-auto w-full table-fixed text-xs sm:text-sm text-slate-800">
              <thead className="bg-white text-[10px] sm:text-sm font-semibold uppercase tracking-[0.4em] text-slate-900 text-center sm:text-left">
                <tr>
                  <th className="hidden px-5 py-4 text-left font-semibold text-slate-900 sm:table-cell">
                    Feature
                  </th>
                  <th className="w-1/3 px-3 py-4 text-center text-[11px] sm:w-auto sm:text-base font-bold tracking-normal text-slate-900">
                    <span className="block sm:inline">Starter</span>{" "}
                    <span className="block sm:inline">Plan</span>
                  </th>
                  <th className="w-1/3 px-3 py-4 text-center text-[11px] sm:w-auto sm:text-base font-bold tracking-normal text-slate-900">
                    <span className="block sm:inline">Essential</span>{" "}
                    <span className="block sm:inline">Plus</span>
                  </th>
                  <th className="w-1/3 px-3 py-4 text-center text-[11px] sm:w-auto sm:text-base font-bold tracking-normal text-slate-900">
                    <span className="block sm:inline">Signature</span>{" "}
                    <span className="block sm:inline">Pro</span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {[
                  { feature: "Unlimited PDF uploads", basic: true, pro: true, business: true },
                  { feature: "PDF editing (merge, split, reorder)", basic: true, pro: true, business: true },
                  { feature: "Self-sign documents", basic: true, pro: true, business: true },
                  { feature: "Send documents for signature", basic: false, pro: true, business: true },
                  { feature: "Monthly remote signature limit", basic: "—", pro: "10 per month", business: "Unlimited" },
                  { feature: "Signature tracking (opened / viewed / signed)", basic: false, pro: true, business: true },
                  { feature: "Audit log (activity history)", basic: false, pro: true, business: true },
                  { feature: "Branded emails", basic: false, pro: true, business: "✔ (custom branding)" },
                  { feature: "Add teammates / team workspace", basic: false, pro: false, business: true },
                  { feature: "Templates & advanced workflows", basic: false, pro: false, business: true },
                ].map((row) => (
                  <>
                    <tr
                      key={`${row.feature}-values`}
                      className="text-center sm:text-left sm:border-b sm:border-slate-200 sm:last:border-0"
                    >
                      <td className="hidden px-5 py-5 text-xs sm:text-sm font-semibold text-slate-900 sm:table-cell">
                        {row.feature}
                      </td>
                      <td className="w-1/3 px-3 py-5 text-center text-xs sm:w-auto sm:text-sm font-semibold text-slate-900">
                        {renderValue((row as any).basic)}
                      </td>
                      <td className="w-1/3 px-3 py-5 text-center text-xs sm:w-auto sm:text-sm font-semibold text-slate-900">
                        {renderValue((row as any).pro)}
                      </td>
                      <td className="w-1/3 px-3 py-5 text-center text-xs sm:w-auto sm:text-sm font-semibold text-slate-900">
                        {renderValue((row as any).business)}
                      </td>
                    </tr>
                    <tr key={`${row.feature}-label`} className="border-b border-slate-200 sm:hidden">
                      <td
                        colSpan={4}
                        className="px-3 pb-4 pt-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {row.feature}
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
            Frequently asked questions
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
