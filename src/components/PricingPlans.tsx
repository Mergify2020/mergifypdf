"use client";

import { Check, X } from "lucide-react";

const tiers = [
  {
    name: "Mergify Core",
    price: "$6.99",
    detail: "One User / Billed Monthly",
    accent: "from-[#FFB480] to-[#FF8A4E]",
    button: "bg-[#FF8A4E]",
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
    detail: "Up to 3 Users / Billed Monthly",
    accent: "from-[#A9C7FF] via-[#7BA8F4] to-[#4D74C8]",
    button: "bg-[#4D74C8]",
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
    detail: "Each Additional User / Monthly",
    accent: "from-[#38D0A5] to-[#23B58A]",
    button: "bg-[#23B58A]",
    features: [
      "Everything in Team Workspace",
      "Add unlimited extra teammates",
      "Perfect for growing businesses",
    ],
  },
];

export default function PricingPlans() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020610] via-[#060f1e] to-[#020610] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="rounded-[46px] border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-10 text-center text-white shadow-[0_80px_180px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <h1 className="text-3xl font-semibold tracking-tight">Choose the workspace that fits you.</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white p-6 shadow-[0_50px_140px_rgba(0,0,0,0.35)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-white/0 to-transparent" />
              <div className="relative z-10 flex h-full flex-col">
                <div className={`rounded-3xl bg-gradient-to-br ${tier.accent} p-5 text-white shadow-inner`}>
                  <h2 className="text-3xl font-semibold">{tier.name}</h2>
                  <div className="mt-4">
                    <p className="text-4xl font-semibold">{tier.price}</p>
                    <p className="mt-1 text-sm opacity-80">{tier.detail}</p>
                  </div>
                </div>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-600">
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
                  className={`pointer-events-none mt-8 w-full rounded-full px-4 py-3 text-sm font-semibold text-white shadow-md shadow-black/10 ${tier.button}`}
                >
                  Upgrade
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[40px] border border-white/15 bg-white/5 p-6 text-sm text-white shadow-[0_50px_150px_rgba(0,0,0,0.35)] backdrop-blur">
          <p className="mb-6 text-center text-3xl font-semibold tracking-tight text-white">Compare plans</p>
          <div className="overflow-hidden rounded-2xl border border-white/20">
            <table className="w-full divide-y divide-white/10 text-sm text-white">
              <thead className="bg-white/10 text-xs uppercase tracking-[0.4em] text-white/70">
                <tr>
                  <th className="p-4 text-left font-semibold">Feature</th>
                  <th className="p-4 text-center font-semibold">Core</th>
                  <th className="p-4 text-center font-semibold">Team Workspace</th>
                  <th className="p-4 text-center font-semibold">Scale</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {[
                  { feature: "Unlimited uploads", core: true, team: true, scale: true },
                  { feature: "Team folders", core: false, team: true, scale: true },
                  { feature: "Member controls", core: false, team: false, scale: true },
                  { feature: "Add teammates", core: "–", team: "Up to 3", scale: "Unlimited" },
                  { feature: "Billing", core: "Single", team: "Team", scale: "Per seat" },
                ].map((row) => (
                  <tr key={row.feature} className="border-white/10">
                    <td className="p-4 text-white/60">{row.feature}</td>
                    <td className="p-4 text-center">{renderValue(row.core)}</td>
                    <td className="p-4 text-center">{renderValue(row.team)}</td>
                    <td className="p-4 text-center">{renderValue(row.scale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderValue(value: boolean | string) {
  if (typeof value === "string") {
    return value;
  }
  if (value) {
    return <Check className="h-4 w-4 text-emerald-300" strokeWidth={2} />;
  }
  return <X className="h-4 w-4 text-rose-300" strokeWidth={2} />;
}
