"use client";

import Image from "next/image";
import { Check, X } from "lucide-react";

const tiers = [
  {
    name: "Mergify Basic",
    price: "$8.95",
    originalPrice: "$11.99",
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
    name: "Mergify Sign Pro",
    price: "$15.95",
    originalPrice: "$19.99",
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
      "Add more signatures anytime",
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
    <div className="pricing-gradient min-h-screen px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-10 px-2">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white drop-shadow-[0_10px_35px_rgba(15,23,42,0.4)]">
            Choose the workspace built for your workflow.
          </h1>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {tiers.map((tier) => {
            const isPremium = Boolean(tier.badge);
            return (
              <div
                key={tier.name}
                className={`relative flex h-full flex-col overflow-hidden rounded-2xl px-6 py-6 transition-transform duration-150 ${
                  isPremium
                    ? "border border-indigo-300 bg-white/95 shadow-[0_22px_60px_rgba(79,70,229,0.35)] md:scale-[1.03]"
                    : "border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.18)]"
                }`}
              >
                <div className="relative z-10 flex h-full flex-col">
                  <div
                    className={`relative overflow-hidden rounded-3xl px-5 py-4 ${
                      isPremium
                        ? "border border-indigo-200 bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50 shadow-md"
                        : "border border-slate-200 bg-white shadow-sm"
                    }`}
                  >
                  <div className="relative z-10">
                    {tier.badge ? (
                      <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-900/90 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
                        <span className="h-2 w-2 rounded-full bg-white/90" />
                        {tier.badge}
                      </span>
                    ) : null}
                    <div className={tier.badge ? "" : "pt-2"}>
                      <h2 className="text-3xl font-semibold leading-tight text-slate-900">
                        {tier.name}
                      </h2>
                      <div className="mt-6">
                        {("originalPrice" in tier && tier.originalPrice) ? (
                          <div className="mb-1 flex items-baseline gap-2 text-sm">
                            <span className="text-slate-400 line-through">{(tier as any).originalPrice}</span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              Save 25%
                            </span>
                          </div>
                        ) : null}
                        <p className="text-5xl font-semibold text-slate-900">{tier.price}</p>
                        <p className="mt-2 text-sm text-slate-500">{tier.detail}</p>
                        <p className="mt-3 text-sm text-slate-600">{tier.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <ul className="mt-8 flex-1 space-y-4 text-sm text-slate-600">
                  {tier.features.map((feature) => {
                    const isBold = feature === "Everything in Personal";
                    return (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                          <div className="h-1 w-3 rounded-full bg-slate-400" />
                        </span>
                        <span className={isBold ? "font-semibold text-slate-800" : undefined}>{feature}</span>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  disabled
                  className="pointer-events-none mt-10 w-full rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_26px_rgba(15,23,42,0.3)]"
                >
                  Upgrade
                </button>
              </div>
            </div>
          ))}
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
