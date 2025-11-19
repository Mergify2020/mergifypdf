"use client";

import { Check, X } from "lucide-react";

const tiers = [
  {
    name: "Mergify Personal",
    price: "$6.99",
    detail: "Per user / month",
    accent: "from-[#FFB480] to-[#FF8A4E]",
    overlay: "from-orange-300/30 to-transparent",
    button: "bg-[#FF8A4E]",
    description: "For individuals, freelancers, students, small solos.",
    features: [
      "Unlimited PDF uploads",
      "Unlimited edits + merges",
      "Highlight + studio tools",
      "Cloud saves & resume project",
      "Priority processing speed",
    ],
  },
  {
    name: "Mergify Team",
    price: "$12.99",
    detail: "Up to 3 users",
    accent: "from-[#A9C7FF] via-[#7BA8F4] to-[#4D74C8]",
    overlay: "from-sky-200/25 to-transparent",
    button: "bg-[#4D74C8]",
    badge: "Most Popular",
    description: "For small teams, offices, construction crews, etc.",
    features: [
      "Everything in Personal",
      "Shared team workspace",
      "Team projects & folders",
      "Activity log",
      "Member permissions",
    ],
  },
  {
    name: "Mergify Business",
    price: "+$4",
    detail: "Per extra user",
    accent: "from-[#38D0A5] to-[#23B58A]",
    overlay: "from-emerald-200/30 to-transparent",
    button: "bg-[#23B58A]",
    description: "For growing teams and organizations.",
    features: [
      "Everything in Team",
      "Add unlimited extra teammates",
      "Perfect for growing businesses",
    ],
  },
];

const faqs = [
  {
    question: "Can I upgrade anytime?",
    answer: "Yes — your workspace scales instantly when you change plans.",
  },
  {
    question: "How does seat billing work?",
    answer: "Team covers up to 3 users. Business adds $4 per extra user each month.",
  },
  {
    question: "Is MergifyPDF secure?",
    answer: "All uploads are encrypted in transit and processed privately.",
  },
  {
    question: "Do I need a credit card right now?",
    answer: "Not until paid upgrades are enabled inside your account.",
  },
];

export default function PricingPlans() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#080f1c] via-[#0c1526] to-[#070d18] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="rounded-[46px] border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-10 text-center text-white shadow-[0_80px_180px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <h1 className="text-3xl font-semibold tracking-tight">Choose the workspace that fits you.</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white px-7 py-10 shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 via-white/0 to-transparent" />
              <div className="relative z-10 flex h-full flex-col">
                <div className={`relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br ${tier.accent} p-6 text-white shadow-inner`}>
                  <div className="relative z-10">
                    {tier.badge ? (
                      <span className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                        {tier.badge}
                      </span>
                    ) : null}
                    <div className={tier.badge ? "" : "pt-2"}>
                      <h2 className="text-3xl font-semibold leading-tight">{tier.name}</h2>
                      <div className="mt-6">
                      <p className="text-5xl font-semibold text-white">{tier.price}</p>
                      <p className="mt-2 text-sm opacity-90">{tier.detail}</p>
                      <p className="mt-3 text-sm text-white/70">{tier.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${tier.overlay}`} />
                </div>
                <ul className="mt-8 flex-1 space-y-4 text-sm text-slate-600">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                        <div className="h-1 w-3 rounded-full bg-slate-400" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled
                  className={`pointer-events-none mt-10 w-full rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] ${tier.button}`}
                >
                  Upgrade
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[40px] border border-white/15 bg-white/5 p-6 text-sm text-white shadow-[0_50px_150px_rgba(0,0,0,0.35)] backdrop-blur">
          <p className="mb-6 text-center text-3xl font-semibold tracking-tight text-white">Compare plans</p>
          <div className="overflow-hidden rounded-3xl border border-white/10">
            <table className="w-full text-sm text-white">
              <thead className="bg-white/10 text-sm uppercase tracking-[0.4em] text-white">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">Feature</th>
                  <th className="px-5 py-4 text-center text-base font-semibold tracking-normal">Personal</th>
                  <th className="px-5 py-4 text-center text-base font-semibold tracking-normal">Team</th>
                  <th className="px-5 py-4 text-center text-base font-semibold tracking-normal">Business</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {[
                  { feature: "Unlimited uploads", personal: true, team: true, business: true },
                  { feature: "Team folders", personal: false, team: true, business: true },
                  { feature: "Member controls", personal: false, team: false, business: true },
                  { feature: "Add teammates", personal: false, team: "Up to 3", business: "Unlimited" },
                  { feature: "Billing", personal: "Per user", team: "Team", business: "Per seat" },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-5 text-white/70">{row.feature}</td>
                    <td className="px-5 py-5 text-center">{renderValue(row.personal)}</td>
                    <td className="px-5 py-5 text-center">{renderValue(row.team)}</td>
                    <td className="px-5 py-5 text-center">{renderValue(row.business)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-12 grid gap-6 text-left md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/80">
                <h3 className="text-base font-semibold text-white">{faq.question}</h3>
                <p className="mt-2 text-sm text-white/70">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 border-t border-white/5 pt-8 text-center text-sm text-white/60">
          Need a custom plan? Contact support and we will tailor a workspace for your team.
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
        <Check className="h-4 w-4 text-emerald-300" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className="flex justify-center">
      <X className="h-4 w-4 text-rose-300" strokeWidth={2} />
    </span>
  );
}
