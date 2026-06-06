"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, CreditCard, ShieldCheck, Download, Lock } from "lucide-react";
import RevealOnScroll from "@/components/RevealOnScroll";
import { BILLING_PRICE_IDS, FREE_TRIAL_DAYS } from "@/lib/billingPlans";
import PricingTierCards from "@/components/PricingTierCards";

export default function PricingPlans() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [billingPreferenceReady, setBillingPreferenceReady] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const toggleRef = useRef<HTMLDivElement | null>(null);
  const monthlyRef = useRef<HTMLButtonElement | null>(null);
  const annualRef = useRef<HTMLButtonElement | null>(null);
  const [toggleHighlight, setToggleHighlight] = useState({ left: 0, width: 0 });
  const [trialStatus, setTrialStatus] = useState<null | {
    eligibleForTrial: boolean;
    eligibleForTrialByPlan?: {
      essentialPlus?: boolean;
      signaturePro?: boolean;
    };
  }>(null);
  const [shouldAnimateToggle, setShouldAnimateToggle] = useState(false);
  const toggleMeasured = toggleHighlight.width > 0;

  const PRICE_IDS: Record<string, { monthly?: string; annual?: string }> = {
    "Essential Plus": {
      monthly: BILLING_PRICE_IDS.essential_plus.monthly,
      annual: BILLING_PRICE_IDS.essential_plus.annual,
    },
    "Signature Pro": {
      monthly: BILLING_PRICE_IDS.signature_pro.monthly,
      annual: BILLING_PRICE_IDS.signature_pro.annual,
    },
  };

  function canUseTrialForPlan(planName: string) {
    const byPlan = trialStatus?.eligibleForTrialByPlan;
    if (!byPlan) return trialStatus?.eligibleForTrial !== false;
    if (planName === "Essential Plus") return byPlan.essentialPlus !== false;
    if (planName === "Signature Pro") return byPlan.signaturePro !== false;
    return trialStatus?.eligibleForTrial !== false;
  }

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

  function handleBillingPeriodChange(nextPeriod: "monthly" | "annual") {
    if (nextPeriod === billingPeriod) return;
    setShouldAnimateToggle(true);
    setBillingPeriod(nextPeriod);
  }

  useLayoutEffect(() => {
    try {
      const stored = window.localStorage.getItem("pricing:billing-period");
      if (stored === "monthly" || stored === "annual") {
        setBillingPeriod(stored);
      }
    } catch {
      // ignore storage access errors
    }
    setBillingPreferenceReady(true);
  }, []);

  useEffect(() => {
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

    const rafId = window.requestAnimationFrame(updateHighlight);
    window.addEventListener("resize", updateHighlight);
    return () => {
      window.removeEventListener("resize", updateHighlight);
      window.cancelAnimationFrame(rafId);
    };
  }, [billingPeriod]);

  useEffect(() => {
    if (!billingPreferenceReady) return;
    try {
      window.localStorage.setItem("pricing:billing-period", billingPeriod);
    } catch {
      // ignore storage access errors
    }
  }, [billingPeriod, billingPreferenceReady]);

  useEffect(() => {
    let active = true;
    const loadTrialStatus = async () => {
      try {
        const res = await fetch("/api/account/trial-status");
        if (!res.ok) return;
        const data = (await res.json()) as {
          eligibleForTrial?: boolean;
          eligibleForTrialByPlan?: {
            essentialPlus?: boolean;
            signaturePro?: boolean;
          };
        };
        if (active && typeof data.eligibleForTrial === "boolean") {
          setTrialStatus({
            eligibleForTrial: data.eligibleForTrial,
            eligibleForTrialByPlan: data.eligibleForTrialByPlan,
          });
        }
      } catch {
        // no-op
      }
    };
    void loadTrialStatus();
    return () => {
      active = false;
    };
  }, []);

  function scrollToPricingTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
        <div id="pricing-page-intro" className="text-center">
          <RevealOnScroll as="div">
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              Simple pricing. Smart workflows.
            </h1>
          </RevealOnScroll>
          <RevealOnScroll as="div" delayMs={70}>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-white/90">
              Try all features free for 3 days.
            </p>
          </RevealOnScroll>
          <RevealOnScroll as="div" delayMs={130} className="mt-6 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-white/50 bg-white/15 p-[3px] text-sm font-semibold backdrop-blur">
              <div ref={toggleRef} className="relative inline-flex items-center rounded-full">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full bg-white shadow-[0_6px_16px_rgba(15,23,42,0.18)] ${
                    billingPreferenceReady && toggleHighlight.width > 0 ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    width: toggleHighlight.width,
                    transform: `translateX(${toggleHighlight.left}px)`,
                    transition: shouldAnimateToggle
                      ? "transform 220ms ease, width 220ms ease, opacity 200ms ease"
                      : "opacity 200ms ease",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleBillingPeriodChange("monthly")}
                  ref={monthlyRef}
                  className={`relative z-10 rounded-full px-5 py-2 whitespace-nowrap tracking-wide transition-colors ${
                    !billingPreferenceReady
                      ? "text-white"
                      : billingPeriod === "monthly" && toggleMeasured
                          ? "text-slate-900"
                          : "text-white hover:text-slate-200"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => handleBillingPeriodChange("annual")}
                  ref={annualRef}
                  className={`relative z-10 rounded-full pl-4 pr-2 py-2 whitespace-nowrap tracking-wide transition-colors ${
                    !billingPreferenceReady
                      ? "text-white"
                      : billingPeriod === "annual" && toggleMeasured
                          ? "text-slate-900"
                          : "text-white hover:text-slate-200"
                  }`}
                >
                Annual ·{" "}
                <span
                  className="rounded-full bg-emerald-500 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white"
                >
                  SAVE UP TO 42%
                </span>
              </button>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        <div className="mx-auto w-full max-w-full md:max-w-4xl">
          <PricingTierCards
            billingPeriod={billingPeriod}
            canUseTrialForPlan={canUseTrialForPlan}
            getPrimaryActionLabel={(_, canUseTrial) =>
              canUseTrial ? `Start ${FREE_TRIAL_DAYS}-day trial` : "Subscribe now"
            }
            getPrimaryActionOptions={(_, canUseTrial) => (canUseTrial ? undefined : { skipTrial: true })}
            onPrimaryAction={(tierName, options) => {
              void handleSelectPlan(tierName, options);
            }}
            getSecondaryActionLabel={(_, canUseTrial) => (canUseTrial ? "Pay now" : null)}
            onSecondaryAction={(tierName) => {
              void handleSelectPlan(tierName, { skipTrial: true });
            }}
            loadingPlan={loadingPlan}
            className="grid w-full scroll-mt-28 gap-10 md:grid-cols-2"
          />
        </div>
        <RevealOnScroll as="div" variant="fade" className="mt-5 flex justify-center">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
            <span>Payments powered by</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/Stripe-Logo-v3.png"
              alt="Stripe"
              className="h-5 sm:h-6 w-auto rounded-md opacity-90 transition-opacity hover:opacity-100"
            />
          </div>
        </RevealOnScroll>
        <section className="mt-10">
          <RevealOnScroll as="div" variant="fade" className="border-t border-slate-200/70 pt-10">
            <h2 className="mb-5 text-center text-3xl font-semibold text-slate-900 sm:text-4xl">
              Everything you need to work with confidence
            </h2>
          </RevealOnScroll>
          <div className="mx-auto grid max-w-6xl gap-3 md:grid-cols-2 lg:grid-cols-4">
            <RevealOnScroll as="div" delayMs={60}>
              <div className="flex min-h-[92px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CreditCard className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-slate-800">Secure payment processing</p>
              </div>
            </RevealOnScroll>
            <RevealOnScroll as="div" delayMs={120}>
              <div className="flex min-h-[92px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-slate-800">Secure cloud storage</p>
              </div>
            </RevealOnScroll>
            <RevealOnScroll as="div" delayMs={180}>
              <div className="flex min-h-[92px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Download className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-slate-800">No software install required</p>
              </div>
            </RevealOnScroll>
            <RevealOnScroll as="div" delayMs={240}>
              <div className="flex min-h-[92px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Lock className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-slate-800">Signature workflow controls</p>
              </div>
            </RevealOnScroll>
          </div>
        </section>
        <section className="mt-12 border-t border-slate-200/70 pt-10">
          <RevealOnScroll as="div">
            <h2 className="text-center text-3xl font-semibold text-slate-900 sm:text-4xl">It All Comes Down to How You Handle Documents</h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-500 sm:text-base">
              Whether you handle your own documents or send them to others for signature, there&apos;s a plan built for you.
            </p>
          </RevealOnScroll>
          <div className="mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-2">
            <RevealOnScroll as="article" delayMs={80} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-500" aria-hidden="true" />
              <h3 className="text-2xl font-semibold text-slate-900">Essential Plus</h3>
              <p className="mt-3 text-xs font-semibold tracking-[0.12em] text-sky-700 uppercase">
                Best for one user editing, organizing, and signing their own documents.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-sky-100 text-sky-700" aria-hidden="true">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>Businesses editing PDFs before sending them out</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-sky-100 text-sky-700" aria-hidden="true">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>Freelancers preparing proposals and reports for clients</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-sky-100 text-sky-700" aria-hidden="true">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>Offices organizing statements and reports into one file</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-sky-100 text-sky-700" aria-hidden="true">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>Students merging essays and projects for submission</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-sky-100 text-sky-700" aria-hidden="true">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>Individuals completing and signing forms digitally</span>
                </li>
              </ul>
            </RevealOnScroll>
            <RevealOnScroll as="article" delayMs={160} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500" aria-hidden="true" />
              <h3 className="text-2xl font-semibold text-slate-900">Signature Pro</h3>
              <p className="mt-3 text-xs font-semibold tracking-[0.12em] text-indigo-700 uppercase">Best for one user sending documents to one or multiple signers.</p>
              <ul className="mt-5 space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-indigo-100 text-indigo-700" aria-hidden="true">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>HR sending onboarding documents for signature</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-indigo-100 text-indigo-700" aria-hidden="true">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>Businesses sending contracts to clients or vendors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-indigo-100 text-indigo-700" aria-hidden="true">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>Property managers requesting lease signatures from tenants</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-indigo-100 text-indigo-700" aria-hidden="true">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>Agencies sending service agreements before starting work</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-indigo-100 text-indigo-700" aria-hidden="true">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>Organizations handling documents that require multiple signers</span>
                </li>
              </ul>
            </RevealOnScroll>
          </div>
        </section>
        <section className="mt-12 mb-2 border-t border-slate-200/70 pt-10">
          <RevealOnScroll
            as="div"
            className="mx-auto grid w-full max-w-6xl items-center gap-8 rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:p-6 lg:grid-cols-[1.1fr_0.9fr] lg:text-left xl:grid-cols-[1fr_1fr]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/illustrations/hero-ipad-illustration.png"
              alt=""
              className="mx-auto h-auto w-auto max-h-72 rounded-xl border border-slate-200/70 shadow-[0_10px_28px_rgba(15,23,42,0.10)] sm:max-h-80 lg:mx-0 lg:max-h-96"
              aria-hidden="true"
            />
            <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
              <div>
                <p className="text-center text-3xl leading-tight font-semibold text-slate-900 sm:text-4xl lg:text-[2.35rem] xl:text-[2.75rem] lg:text-left">
                  <span className="block">Ready to simplify your</span>
                  <span className="block whitespace-nowrap">document workflow?</span>
                </p>
                <p className="mt-3 text-center text-base leading-relaxed text-slate-600 sm:text-lg lg:text-left">
                  Edit, merge, and collect signatures from one secure workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={scrollToPricingTop}
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-gradient-to-r from-[#6D5EF3] to-[#8B7CFF] px-9 py-3 text-base font-semibold text-white shadow-[0_14px_28px_rgba(109,94,243,0.28)] transition hover:-translate-y-0.5 hover:from-[#7567F5] hover:to-[#9486FF]"
              >
                Start 3-day trial →
              </button>
            </div>
          </RevealOnScroll>
        </section>

      </div>
    </div>
  );
}
