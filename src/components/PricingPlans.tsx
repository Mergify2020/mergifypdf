"use client";

import Link from "next/link";

const tiers = [
  {
    name: "Mergify Core",
    price: "$6.99",
    detail: "per user / month",
    accent: "from-[#FFB480] to-[#FF8A4E]",
    button: "bg-[#FF8A4E]",
    note: "Main premium personal plan",
    features: [
      "Unlimited PDF uploads",
      "Unlimited edits + merges",
      "Highlight + studio tools",
      "Cloud saves & resume project",
      "Priority processing speed",
    ],
  },
  {
    name: "Mergify Team Workspace",
    price: "$12.99",
    detail: "per month (up to 3 users)",
    accent: "from-[#3E5669] to-[#2B4257]",
    button: "bg-[#2B4257]",
    note: "Shared spaces for small teams",
    features: [
      "Everything in Core",
      "Shared team workspace",
      "Team projects & folders",
      "Activity log",
      "Member permissions",
    ],
  },
  {
    name: "Mergify Scale",
    price: "+$4",
    detail: "per additional user",
    accent: "from-[#38D0A5] to-[#23B58A]",
    button: "bg-[#23B58A]",
    note: "Expand your team beyond 3 seats",
    features: [
      "Everything in Team Workspace",
      "Add unlimited extra teammates",
      "Perfect for growing businesses",
    ],
  },
];

export default function PricingPlans() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f4f7fb] to-white px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="rounded-[44px] border border-white/70 bg-white/95 p-10 shadow-[0_50px_150px_rgba(15,23,42,0.12)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.5em] text-[#7b8ca8]">Plans &amp; pricing</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">
            Pick the workspace that fits your team.
          </h1>
          <p className="mt-3 max-w-3xl text-base text-slate-500">
            Billing is not live yet—review the tiers below and stay tuned for in-app upgrades.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="rounded-[30px] border border-white/80 bg-white/95 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.12)] backdrop-blur"
            >
              <div
                className={`rounded-3xl bg-gradient-to-br ${tier.accent} p-4 text-white shadow-inner`}
              >
                <p className="text-xs uppercase tracking-[0.5em] opacity-70">{tier.note}</p>
                <h2 className="mt-2 text-2xl font-semibold">{tier.name}</h2>
                <p className="mt-1 text-sm opacity-80">{tier.detail}</p>
              </div>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-slate-900">{tier.price}</span>
                <span className="text-sm text-slate-500">{tier.detail}</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled
                className={`mt-8 w-full rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 ${tier.button} opacity-70`}
              >
                Upgrade coming soon
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-[38px] border border-dashed border-slate-200 bg-white/95 p-6 text-center text-sm text-slate-500 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          Need something custom? {" "}
          <Link href="mailto:hello@mergifypdf.com" className="font-semibold text-[#024d7c]">
            Contact us
          </Link>{" "}
          for enterprise onboarding.
        </div>
      </div>
    </div>
  );
}
