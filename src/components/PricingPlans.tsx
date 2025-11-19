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
    <div className="min-h-screen bg-gradient-to-b from-[#020a17] via-[#0f1f3b] to-[#07101e] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="rounded-[44px] border border-white/10 bg-white/[0.04] p-10 text-center text-white shadow-[0_60px_160px_rgba(3,10,30,0.35)] backdrop-blur">
          <h1 className="text-3xl font-semibold tracking-tight">Choose the workspace that fits you.</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="rounded-[30px] border border-white/[0.15] bg-white p-6 shadow-[0_50px_140px_rgba(0,0,0,0.4)]"
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
                className={`pointer-events-none mt-8 w-full rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 ${tier.button}`}
              >
                Upgrade
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-[36px] border border-white/[0.1] bg-white/10 p-6 text-sm text-white shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="overflow-hidden rounded-2xl border border-white/20">
            <table className="w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.4em] text-white/70">
                <tr>
                  <th className="p-3">Feature</th>
                  <th className="p-3">Core</th>
                  <th className="p-3">Team Workspace</th>
                  <th className="p-3">Scale</th>
                </tr>
              </thead>
              <tbody className="text-white/90">
                <tr>
                  <td className="p-3 text-white/70">Unlimited uploads</td>
                  <td className="p-3">✅</td>
                  <td className="p-3">✅</td>
                  <td className="p-3">✅</td>
                </tr>
                <tr>
                  <td className="p-3 text-white/70">Team folders</td>
                  <td className="p-3">❌</td>
                  <td className="p-3">✅</td>
                  <td className="p-3">✅</td>
                </tr>
                <tr>
                  <td className="p-3 text-white/70">Member controls</td>
                  <td className="p-3">❌</td>
                  <td className="p-3">❌</td>
                  <td className="p-3">✅</td>
                </tr>
                <tr>
                  <td className="p-3 text-white/70">Add teammates</td>
                  <td className="p-3">❌</td>
                  <td className="p-3">Up to 3</td>
                  <td className="p-3">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-3 text-white/70">Billing</td>
                  <td className="p-3">Single</td>
                  <td className="p-3">Team</td>
                  <td className="p-3">Per seat</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
