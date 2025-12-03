"use client";

import Image from "next/image";
import { Check, X } from "lucide-react";

const tiers = [
  {
    name: "Starter Plan",
    price: "$0",
    detail: "Current plan",
    description: "For getting started with 1 free project per day.",
    features: [
      "1 PDF upload per day",
      "Basic editing tools",
      "Self-sign documents",
      "Email support",
    ],
  },
  {
    name: "Essential Plus",
    price: "$9.95/mo",
    secondaryPrice: "$95/year — Save 20%",
    detail: "Per user / month",
    accent: "from-[#FFB480] to-[#FF8A4E]",
    overlay: "from-orange-300/30 to-transparent",
    button: "bg-[#FF8A4E]",
    description: "For individuals, freelancers, students, and solos.",
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
    price: "$14.95/mo",
    secondaryPrice: "$149/year — Save 17%",
    detail: "Per user / month",
    accent: "from-[#A9C7FF] via-[#7BA8F4] to-[#4D74C8]",
    overlay: "from-sky-200/25 to-transparent",
    button: "bg-[#4D74C8]",
    badge: "MOST POPULAR",
    description: "For professionals and small businesses who need clients to sign remotely.",
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
  return (
    <div className="pricing-gradient min-h-screen px-4 py-12 text-slate-900 lg:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-10 px-4 lg:px-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 drop-shadow-[0_10px_35px_rgba(15,23,42,0.4)]">
            Choose the workspace built for your workflow.
          </h1>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {tiers.map((tier) => {
            const isPremium = Boolean(tier.badge);
            const isFree = tier.name === "Starter Plan";
            return (
              <div
                key={tier.name}
                className={`frosted-card flex h-full flex-col overflow-hidden rounded-[24px] px-6 py-4 transition-transform duration-150 ${
                  isPremium ? "ring-1 ring-purple-200/60" : ""
                }`}
              >
                <div className="relative z-10 flex h-full flex-col">
                  <div
                    className={`frosted-card-inner relative min-h-[180px] overflow-hidden rounded-[20px] px-5 py-3 shadow-inner ${
                      isPremium ? "ring-1 ring-white/40" : ""
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
                        <h2 className="text-2xl font-semibold leading-tight text-slate-900">
                          {tier.name}
                        </h2>
                        <div className="mt-6">
                          <div className="flex items-baseline gap-1">
                            <p className="text-4xl font-semibold text-slate-900">{tier.price}</p>
                          </div>
                          {tier.secondaryPrice ? (
                            <p className="text-sm font-semibold text-slate-600">{tier.secondaryPrice}</p>
                          ) : null}
                          {isFree ? (
                            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                              {tier.detail}
                            </p>
                          ) : null}
                          <p className="mt-3 text-sm text-slate-600">{tier.description}</p>
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
                              isPremium ? "bg-indigo-100" : "bg-slate-100"
                            }`}
                          >
                            <div
                              className={`h-1 w-3 rounded-full ${
                                isPremium ? "bg-indigo-500" : "bg-slate-400"
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
                    className={`pointer-events-none mt-6 w-full rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all duration-150 ${
                      isFree
                        ? "bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.55)]"
                        : isPremium || tier.name === "Essential Plus"
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-xl hover:scale-[1.01]"
                          : "bg-black hover:opacity-90"
                    }`}
                  >
                    {isFree ? "Current plan" : "Upgrade"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-[40px] border border-slate-200 bg-white p-6 text-sm text-slate-900 shadow-[0_40px_120px_rgba(15,23,42,0.15)]">
          <p className="mb-6 text-center text-3xl font-semibold tracking-tight text-slate-900">Compare plans</p>
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <table className="w-full text-sm text-slate-800">
              <thead className="bg-slate-50 text-sm uppercase tracking-[0.4em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">Feature</th>
                  <th className="px-5 py-4 text-center text-base font-semibold tracking-normal">Basic</th>
                  <th className="px-5 py-4 text-center text-base font-semibold tracking-normal">Sign Pro</th>
                  <th className="px-5 py-4 text-center text-base font-semibold tracking-normal">Business</th>
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
                  { feature: "Support", basic: "Standard", pro: "Priority (signing)", business: "Priority" },
                  { feature: "Billing", basic: "Per user", pro: "Per user", business: "Per user / seat" },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-5 text-slate-600">{row.feature}</td>
                    <td className="px-5 py-5 text-center">{renderValue((row as any).basic)}</td>
                    <td className="px-5 py-5 text-center">{renderValue((row as any).pro)}</td>
                    <td className="px-5 py-5 text-center">{renderValue((row as any).business)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[46px] border border-slate-200 bg-white p-8 text-slate-900 shadow-[0_40px_120px_rgba(15,23,42,0.18)]">
          <p className="mb-8 text-center text-3xl font-semibold tracking-tight text-slate-900">
            Frequently asked questions
          </p>
          <div className="grid gap-6 text-left md:grid-cols-2">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
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
    return <span className="block text-center">{value}</span>;
  }
  if (value) {
    return (
      <span className="flex justify-center">
        <Check className="h-4 w-4 text-emerald-500" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className="flex justify-center">
      <X className="h-4 w-4 text-rose-400" strokeWidth={2} />
    </span>
  );
}
