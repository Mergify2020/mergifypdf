"use client";

import Image from "next/image";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { Check, Layers, X } from "lucide-react";

const tiers = [
  {
    name: "Essential Plus",
    price: "$12.99 per month",
    secondaryPrice: "$7.99 per month — Save 20% Compared to Monthly",
    detail: "Per user / month",
            accent: "from-[#FFB480] to-[#FF8A4E]",
            overlay: "from-orange-300/30 to-transparent",
            button: "bg-[#FF8A4E]",
            pricePanel: "bg-white",
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
    price: "$19.99 per month",
    secondaryPrice: "$11.99 per month — Save 20% Compared to Monthly",
    detail: "Per user / month",
            accent: "from-[#A9C7FF] via-[#7BA8F4] to-[#4D74C8]",
            overlay: "from-sky-200/25 to-transparent",
            button: "bg-[#4D74C8]",
    description: "",
            pricePanel: "bg-white",
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
  const toggleRef = useRef<HTMLDivElement | null>(null);
  const monthlyRef = useRef<HTMLButtonElement | null>(null);
  const annualRef = useRef<HTMLButtonElement | null>(null);
  const [toggleHighlight, setToggleHighlight] = useState({ left: 0, width: 0 });

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

  async function handleSelectPlan(tierName: string, options?: { skipTrial?: boolean }) {
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
        body: JSON.stringify({ priceId, skipTrial: options?.skipTrial === true }),
      });

      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/pricing";
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

  useLayoutEffect(() => {
    function updateHighlight() {
      const container = toggleRef.current;
      const button = billingPeriod === "monthly" ? monthlyRef.current : annualRef.current;
      if (!container || !button) return;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      setToggleHighlight({
        left: Math.max(0, buttonRect.left - containerRect.left),
        width: buttonRect.width,
      });
    }

    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    return () => window.removeEventListener("resize", updateHighlight);
  }, [billingPeriod]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F6F8FF] px-4 py-12 text-slate-900 lg:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px]">
        <Image
          src="/backgrounds/login-page-background-v5.svg"
          alt=""
          fill
          className="object-cover object-[50%_10%] scale-[1.08]"
          priority={false}
        />
      </div>
      <div className="relative mx-auto w-full max-w-7xl space-y-10 px-4 lg:px-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Choose the plan that fits your needs.
          </h1>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-white/90">
            Try our 3-day free trial to access all features.
          </p>
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-white/50 bg-white/15 p-[3px] text-sm font-semibold backdrop-blur">
              <div ref={toggleRef} className="relative inline-flex items-center rounded-full">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full bg-white shadow-[0_6px_16px_rgba(15,23,42,0.18)] transition-[transform,width] duration-200 ${
                    toggleHighlight.width > 0 ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    width: toggleHighlight.width,
                    transform: `translateX(${toggleHighlight.left}px)`,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setBillingPeriod("monthly")}
                  ref={monthlyRef}
                  className={`relative z-10 rounded-full px-5 py-2 whitespace-nowrap tracking-wide transition-colors ${
                    billingPeriod === "monthly" ? "text-slate-900" : "text-white hover:text-slate-200"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod("annual")}
                  ref={annualRef}
                  className={`relative z-10 rounded-full pl-4 pr-2 py-2 whitespace-nowrap tracking-wide transition-colors ${
                    billingPeriod === "annual" ? "text-slate-900" : "text-white hover:text-slate-200"
                  }`}
                >
                Annual ·{" "}
                <span
                  className="rounded-full bg-emerald-100 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-emerald-700"
                >
                  SAVE UP TO 42%
                </span>
              </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-full gap-10 md:max-w-4xl md:grid-cols-2">
          {tiers.map((tier) => {
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
            if (billingPeriod === "annual") {
              savingsLabel = tier.name === "Essential Plus" ? "SAVE 42%" : "SAVE 37%";
            }

            const showAnnual = billingPeriod === "annual" && yearlyPrice;
            const displayedPrice = (showAnnual ? yearlyPrice : tier.price) ?? "";
            const [priceAmount, priceSuffix] = displayedPrice.split(" per ");

            const titleClass =
              tier.name === "Essential Plus"
                ? "text-[2.2rem] md:text-[2.1rem] font-bold leading-snug bg-gradient-to-r from-sky-500 to-emerald-400 bg-clip-text text-transparent"
                : "text-[2.2rem] md:text-[2.1rem] font-bold leading-snug bg-gradient-to-r from-purple-500 to-sky-500 bg-clip-text text-transparent";

            return (
              <div
                key={tier.name}
                className="flex h-full w-full flex-col overflow-hidden rounded-[12px] border-[3px] border-slate-300 bg-white px-8 pt-4 pb-8 shadow-[0_10px_24px_rgba(15,23,42,0.10)] transition-transform duration-150"
              >
                <div className="relative z-10 flex h-full flex-col">
                  <div className="relative z-10 mt-2">
                    <div className="pt-1">
                      <h2 className={titleClass}>
                        {tier.name}
                      </h2>
                      <div className="mt-6">
                        <div className="flex items-center gap-2">
                          <p
                            key={displayedPrice}
                            className="price-swap whitespace-nowrap text-[2.8rem] md:text-[3.1rem] font-normal leading-tight tracking-tight text-slate-900"
                          >
                            {priceAmount}
                          </p>
                          {priceSuffix ? (
                            <span key={priceSuffix} className="price-swap text-lg font-medium text-slate-500">
                              per {priceSuffix}
                            </span>
                          ) : null}
                        </div>
                        <div className={`mt-0.5 ${billingPeriod === "annual" ? "h-4" : "h-0"}`} />
                        <div
                          className={`flex items-center gap-2 transition-all duration-200 ${
                            billingPeriod === "annual"
                              ? "mt-0 translate-y-0 opacity-100"
                              : "pointer-events-none mt-[-10px] translate-y-1 opacity-0"
                          }`}
                        >
                          <p className="text-lg font-medium text-slate-500">Billed annually</p>
                          {billingPeriod === "annual" && savingsLabel ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-emerald-700">
                              {savingsLabel}
                            </span>
                          ) : null}
                        </div>
                        {tier.description ? (
                          <p className="mt-3 text-sm leading-snug text-slate-700">{tier.description}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loadingPlan === tier.name}
                    onClick={() => void handleSelectPlan(tier.name)}
                    className={`${
                      billingPeriod === "monthly" ? "mt-2" : "mt-4"
                    } w-full rounded-[12px] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-150 ${
                      "bg-[#0F172A] hover:scale-[1.01] hover:bg-[#0B1220]"
                    } ${loadingPlan === tier.name ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {loadingPlan === tier.name ? "Redirecting..." : (
                      <span className="inline-flex items-center justify-center gap-2">
                        Start 3-day trial
                        <span aria-hidden>→</span>
                      </span>
                    )}
                  </button>
                  <div className="mt-3 flex flex-col items-center gap-2 text-xs font-semibold text-slate-900/80">
                    <button
                      type="button"
                      onClick={() => void handleSelectPlan(tier.name, { skipTrial: true })}
                      className="text-xs font-semibold text-slate-700 underline underline-offset-4 hover:text-slate-900"
                    >
                      Skip trial
                    </button>
                  </div>
                  <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-800">
                    {tier.features.map((feature) => {
                      const isEssentialPlusRow =
                        tier.name === "Signature Pro" && feature === "Everything in Essential Plus";
                      return (
                        <li key={feature} className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-5 w-5 flex-none items-center justify-center rounded-full ${
                              isEssentialPlusRow
                                ? "bg-gradient-to-r from-sky-500 to-emerald-400"
                                : tier.name === "Essential Plus"
                                  ? "bg-sky-500"
                                  : "bg-indigo-500"
                            }`}
                          >
                            {isEssentialPlusRow ? (
                              <Layers className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />
                            ) : (
                              <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />
                            )}
                          </span>
                          <span className="font-semibold text-slate-900">{feature}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex h-6 sm:h-7 justify-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            <span>Payments powered by</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/Stripe-Logo-v3.png"
              alt="Stripe"
              className="h-5 sm:h-6 w-auto rounded-md opacity-90 transition-opacity hover:opacity-100"
            />
          </div>
        </div>

	        <div className="mt-16 rounded-[40px] border border-slate-200 bg-white p-6 text-sm text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.1)] lg:p-8">
	          <p className="mb-6 text-center text-3xl font-semibold tracking-tight text-slate-900">Compare Our Plans</p>
          <div className="overflow-hidden rounded-3xl bg-white shadow-inner">
            <table className="mx-auto w-full table-fixed text-xs sm:text-sm text-slate-800">
              <thead className="bg-black text-[10px] sm:text-sm font-semibold text-white text-center sm:text-left">
                <tr>
                  <th className="hidden px-5 py-4 text-left text-[11px] sm:text-base font-semibold text-white sm:table-cell">
                    Features
                  </th>
                  <th className="w-1/2 px-3 py-4 text-center text-[11px] sm:w-auto sm:text-base font-bold tracking-normal text-white">
                    <span className="block sm:inline">Essential</span>{" "}
                    <span className="block sm:inline">Plus</span>
                  </th>
                  <th className="w-1/2 px-3 py-4 text-center text-[11px] sm:w-auto sm:text-base font-bold tracking-normal text-white">
                    <span className="block sm:inline">Signature</span>{" "}
                    <span className="block sm:inline">Pro</span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {[
                  { feature: "Daily Uploads", essential: "Unlimited", pro: "Unlimited" },
                  { feature: "Project Storage", essential: "Unlimited", pro: "Unlimited" },
                  { feature: "Document Editing", essential: true, pro: true },
                  { feature: "Self-Sign Documents", essential: true, pro: true },
                  { feature: "Templates", essential: true, pro: true },
                  { feature: "AI Document Tools", essential: true, pro: true },
                  { feature: "Access to Mergify Sign", essential: false, pro: true },
                  { feature: "Signature Tracking", essential: false, pro: true },
                  { feature: "Outgoing Signature Requests", essential: false, pro: "10 Per Month" },
                ].map((row) => (
                  <Fragment key={row.feature}>
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
                      <td className="w-1/2 px-3 py-3 sm:py-5 text-center text-xs sm:w-auto sm:text-sm font-semibold text-slate-900">
                        {renderValue((row as any).essential)}
                      </td>
                      <td className="w-1/2 px-3 py-3 sm:py-5 text-center text-xs sm:w-auto sm:text-sm font-semibold text-slate-900">
                        {renderValue((row as any).pro)}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

	        <div className="rounded-[46px] border border-slate-200 bg-white p-8 text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.1)]">
	          <p className="mb-8 text-center text-3xl font-semibold tracking-tight text-slate-900">
	            Frequently Asked Questions
	          </p>
          <div className="grid gap-6 text-left md:grid-cols-2">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-3xl bg-white p-6 text-slate-900 shadow-inner"
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
