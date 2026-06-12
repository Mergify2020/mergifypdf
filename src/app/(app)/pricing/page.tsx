"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import RevealOnScroll from "@/components/RevealOnScroll";
import { BILLING_PRICE_IDS, type BillingPlanTier } from "@/lib/billingPlans";
import PricingTierCards from "@/components/PricingTierCards";

export default function PricingPlans() {
  const searchParams = useSearchParams();
  const autoCheckoutStartedRef = useRef(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [billingPreferenceReady, setBillingPreferenceReady] = useState(false);
  const toggleRef = useRef<HTMLDivElement | null>(null);
  const monthlyRef = useRef<HTMLButtonElement | null>(null);
  const annualRef = useRef<HTMLButtonElement | null>(null);
  const [toggleHighlight, setToggleHighlight] = useState({ left: 0, width: 0 });
  const [shouldAnimateToggle, setShouldAnimateToggle] = useState(false);
  const toggleMeasured = toggleHighlight.width > 0;

  const PRICE_IDS: Record<BillingPlanTier, { monthly: string; annual: string }> = {
    essential_plus: BILLING_PRICE_IDS.essential_plus,
    signature_pro: BILLING_PRICE_IDS.signature_pro,
  };

  function getPlanTierFromName(tierName: string): BillingPlanTier | null {
    if (tierName === "Essential Plus") return "essential_plus";
    if (tierName === "Signature Pro") return "signature_pro";
    return null;
  }

  function getRegisterUrl(tierName: string) {
    const planTier = getPlanTierFromName(tierName);
    if (!planTier) return "/register";
    const params = new URLSearchParams({ plan: planTier, billing: billingPeriod });
    return "/register?" + params.toString();
  }

  function canUseTrialForPlan() {
    return false;
  }

  function handleSelectPlan(tierName: string) {
    window.location.href = getRegisterUrl(tierName);
  }

  function handleBillingPeriodChange(nextPeriod: "monthly" | "annual") {
    if (nextPeriod === billingPeriod) return;
    setShouldAnimateToggle(true);
    setBillingPeriod(nextPeriod);
  }

  useLayoutEffect(() => {
    let storedPeriod: "monthly" | "annual" | null = null;
    try {
      const stored = window.localStorage.getItem("pricing:billing-period");
      if (stored === "monthly" || stored === "annual") {
        storedPeriod = stored;
      }
    } catch {
      // ignore storage access errors
    }

    const rafId = window.requestAnimationFrame(() => {
      if (storedPeriod) {
        setBillingPeriod(storedPeriod);
      }
      setBillingPreferenceReady(true);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
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
    if (autoCheckoutStartedRef.current) return;
    const checkoutPlan = searchParams.get("checkout");
    const checkoutBilling = searchParams.get("billing");
    const validPlan = checkoutPlan === "essential_plus" || checkoutPlan === "signature_pro" ? checkoutPlan : null;
    const validBilling = checkoutBilling === "annual" || checkoutBilling === "monthly" ? checkoutBilling : null;
    if (!validPlan || !validBilling) return;

    autoCheckoutStartedRef.current = true;

    async function startSelectedCheckout() {
      const priceId = PRICE_IDS[validPlan][validBilling];
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (res.status === 401) {
        const callbackUrl = "/pricing?checkout=" + validPlan + "&billing=" + validBilling;
        window.location.href = "/login?callbackUrl=" + encodeURIComponent(callbackUrl);
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
    }

    void startSelectedCheckout();
  }, [searchParams]);


  return (
    <main className="relative isolate -mt-[calc(66px+env(safe-area-inset-top))] min-h-screen overflow-hidden bg-[#050816] pt-[calc(66px+env(safe-area-inset-top))] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(139,124,255,0.30),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(109,94,243,0.24),_transparent_28%),linear-gradient(180deg,#0b1026_0%,#050816_36%,#050816_100%)]" />
        <div className="absolute -left-28 top-32 h-[24rem] w-[24rem] rounded-full bg-white/[0.06] blur-3xl" />
        <div className="absolute right-[-6rem] top-12 h-[26rem] w-[26rem] rounded-full bg-[#7C5CFF]/20 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-[4.5rem]">
        <div id="pricing-page-intro" className="mx-auto max-w-4xl text-center">
          <RevealOnScroll as="div" delayMs={60}>
            <h1 className="mt-0 text-balance text-[clamp(2.15rem,4vw,3.65rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-white">
              <span className="block">Merge, edit, organize,</span>
              <span className="block">and send PDFs for signature.</span>
            </h1>
          </RevealOnScroll>
          <RevealOnScroll as="div" delayMs={110}>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-7 text-white/72 sm:text-lg">
              Choose the plan that fits your needs. Pay monthly or save with annual billing. Upgrade or cancel anytime.
            </p>
          </RevealOnScroll>
          <RevealOnScroll as="div" delayMs={150} className="mt-8 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/8 p-[3px] text-sm font-semibold shadow-[0_16px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <div ref={toggleRef} className="relative inline-flex items-center rounded-full">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full bg-white shadow-[0_10px_20px_rgba(15,23,42,0.18)] ${
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
                        : "text-white/80 hover:text-white"
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
                        : "text-white/80 hover:text-white"
                  }`}
                >
                  Annual ·{" "}
                  <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white">
                    SAVE UP TO 42%
                  </span>
                </button>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        <div className="mx-auto mt-12 w-full max-w-6xl lg:mt-14">
          <PricingTierCards
            billingPeriod={billingPeriod}
            canUseTrialForPlan={canUseTrialForPlan}
            getPrimaryActionLabel={() => "Select Plan"}
            getPrimaryActionOptions={() => ({ skipTrial: true })}
            onPrimaryAction={(tierName) => {
              handleSelectPlan(tierName);
            }}
            tone="dark"
            primaryActionClassName="bg-[#6D5EF3] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_18px_rgba(109,94,243,0.24)] ring-1 ring-white/20 hover:-translate-y-0.5 hover:bg-[#7A6AF5]"
            className="grid w-full gap-6 md:grid-cols-2"
          />
        </div>

        <section className="mx-auto mt-16 max-w-6xl">
          <RevealOnScroll as="div" variant="fade" className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-[clamp(1.8rem,3.6vw,3rem)] font-semibold tracking-[-0.05em] text-white">
              Everything you need to feel confident at checkout.
            </h2>
            <p className="mt-4 text-base leading-7 text-white/68 sm:text-lg">
              Clear pricing, secure payments, and a workflow that stays fast whether you pick monthly or annual.
            </p>
          </RevealOnScroll>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: CreditCard,
                title: "Secure payment processing",
                description: "Checkout is powered by Stripe with a simple handoff and no surprise UI shifts.",
              },
              {
                icon: ShieldCheck,
                title: "Designed for privacy",
                description: "Your documents stay protected with the same security-first posture used across the app.",
              },
              {
                icon: Sparkles,
                title: "Runs entirely in your browser",
                description: "No app install required. Start immediately and manage everything from one place.",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <RevealOnScroll
                  as="article"
                  key={item.title}
                  delayMs={index * 60}
                  className="rounded-[24px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_16px_36px_rgba(0,0,0,0.16)] backdrop-blur-xl"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#BBA6FF] ring-1 ring-white/10">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/68">{item.description}</p>
                    </div>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </section>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-3 text-sm text-white/70">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
            <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            No trial required
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
            <span className="mr-2 h-2 w-2 rounded-full bg-[#8B7CFF]" aria-hidden="true" />
            Cancel anytime from your account
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
            <span className="mr-2 h-2 w-2 rounded-full bg-[#6D5EF3]" aria-hidden="true" />
            Payments powered by Stripe
          </span>
        </div>
      </div>
    </main>
  );
}
