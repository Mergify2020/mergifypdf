"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AlertTriangle, CircleHelp, CreditCard, ExternalLink, Folders, LogOut, Moon, PenLine, Settings, Sparkles, Sun, User } from "lucide-react";
import { useAvatarPreference } from "@/lib/useAvatarPreference";
import { getAvatarFallback } from "@/lib/avatarFallback";
import { getBillingStatusPresentation } from "@/lib/billingPlans";
import { applyThemePreference, persistThemePreference, type ThemeMode } from "@/lib/theme";

export type SettingsMenuProps = {
  variant?: "default" | "pricing";
  trigger?: "avatar" | "icon" | "custom";
  triggerClassName?: string;
  triggerContent?: React.ReactNode;
  triggerLabel?: string;
};

export default function SettingsMenu({
  variant = "default",
  trigger = "avatar",
  triggerClassName,
  triggerContent,
  triggerLabel = "Open profile menu",
}: SettingsMenuProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { data: session, status: sessionStatus } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<string | null>(null);
  const [billingStatusLoaded, setBillingStatusLoaded] = useState(false);
  const [billingPortalPending, setBillingPortalPending] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [themeHydrated, setThemeHydrated] = useState(false);
  const avatarKey = session?.user?.id ?? session?.user?.email ?? null;
  const { avatar } = useAvatarPreference(avatarKey);
  const showProfileSkeleton = sessionStatus === "loading";
  const profileName = (session?.user?.name ?? "").trim();
  const profileEmail = (session?.user?.email ?? "").trim();
  const hasProfileInfo = Boolean(profileName || profileEmail);
  const fallback = getAvatarFallback(avatarKey, profileName || profileEmail || null);

  const outerSizeClass = variant === "pricing" ? "h-12 w-12" : "h-9 w-9";
  const innerSizeClass = variant === "pricing" ? "h-11 w-11" : "h-8 w-8";
  const showAvatarImage = Boolean(avatar) && !avatarLoadFailed && !showProfileSkeleton;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatar]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const htmlHasDark = document.documentElement.classList.contains("dark");
    const stored = window.localStorage.getItem("theme");
    if (stored === "dark" || htmlHasDark) {
      setTheme("dark");
    }
    setThemeHydrated(true);
  }, []);

  useEffect(() => {
    applyThemePreference(theme);
  }, [theme]);

  useEffect(() => {
    const sessionStripeStatus = session?.user?.stripeStatus ?? null;
    setStripeStatus(sessionStripeStatus);
  }, [session?.user?.stripeStatus]);

  useEffect(() => {
    let active = true;

    async function loadPlanStatus() {
      if (!session?.user?.email) {
        if (active) {
          setBillingStatusLoaded(false);
          setStripeStatus(session?.user?.stripeStatus ?? null);
        }
        return;
      }
      try {
        const response = await fetch("/api/account/trial-status");
        if (!response.ok) {
          if (active) {
            setStripeStatus(null);
            setBillingStatusLoaded(true);
          }
          return;
        }
        const data = (await response.json()) as { hasActivePlan?: boolean; stripeStatus?: string | null };
        if (active) {
          setStripeStatus(typeof data.stripeStatus === "string" ? data.stripeStatus : null);
          setBillingStatusLoaded(true);
        }
      } catch {
        if (active) {
          setStripeStatus(null);
          setBillingStatusLoaded(true);
        }
      }
    }

    void loadPlanStatus();
    return () => {
      active = false;
    };
  }, [open, session?.user?.email, session?.user?.stripeStatus]);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleToggle() {
    setOpen((prev) => {
      const next = !prev;
      if (!next) {
        window.requestAnimationFrame(() => {
          triggerRef.current?.blur();
        });
      }
      return next;
    });
  }

  function handlePricing() {
    setOpen(false);
    router.push("/pricing");
  }

  async function handleBillingPortal() {
    setOpen(false);
    setBillingPortalPending(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("workspace-billing-portal-start"));
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        });
      });
    }
    try {
      const response = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: typeof window !== "undefined" ? window.location.href : "/account",
        }),
      });
      const data = await response.json().catch(() => ({} as { url?: string }));
      if (response.ok && typeof data.url === "string" && data.url.length > 0) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // fall through to account page
    }
    setBillingPortalPending(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("workspace-billing-portal-stop"));
    }
    router.push("/account?view=security");
  }

  function handleAccountSettings() {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("open-account-panel"));
    } else {
      router.push("/account");
    }
  }

  function handleProjects() {
    setOpen(false);
    router.push("/projects/all");
  }

  function handleSignatures() {
    setOpen(false);
    router.push("/signature-center");
  }

  function handleHelpCenter() {
    setOpen(false);
    router.push("/support");
  }

  async function handleSignOut() {
    if (busy) return;
    try {
      setBusy(true);
      setOpen(false);
      await signOut({ callbackUrl: "/login" });
    } finally {
      setBusy(false);
    }
  }

  function applyTheme(nextTheme: "light" | "dark") {
    persistThemePreference(nextTheme);
    applyThemePreference(nextTheme);
    setTheme(nextTheme);
  }

  const billingPresentationState = getBillingStatusPresentation(stripeStatus);
  const shouldShowUpdatePaymentCta =
    billingPresentationState === "past_due" || billingPresentationState === "unpaid";
  const shouldShowUpgradePlanCta = billingPresentationState === "none";
  const billingStatusLoading = !billingStatusLoaded && Boolean(session?.user?.email);
  const customTriggerBase =
    "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-100 focus:outline-none active:scale-[0.99]";

  return (
    <>
      <div
        ref={containerRef}
        className={`relative ${trigger === "custom" ? "w-full min-w-0" : ""}`}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          className={
            trigger === "custom"
              ? `${triggerClassName ?? customTriggerBase}`
              : `flex items-center justify-center rounded-full border transition focus:outline-none active:scale-95 ${outerSizeClass} ${
                  trigger === "avatar"
                    ? "border-transparent bg-transparent hover:bg-transparent"
                    : "border-slate-200 bg-white hover:bg-slate-200"
                } ${triggerClassName ?? ""}`
          }
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={triggerLabel}
        >
          {trigger === "custom" ? (
            triggerContent
          ) : (
            <span className="sr-only">{triggerLabel}</span>
          )}
          {trigger === "icon" ? (
            <User className="h-5 w-5 text-slate-700" aria-hidden />
          ) : trigger === "avatar" && showAvatarImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar!}
              alt="Your avatar"
              className={`${innerSizeClass} rounded-full object-cover`}
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : trigger === "avatar" && showProfileSkeleton ? (
            <span
              className={`rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A] ${innerSizeClass}`}
            />
          ) : trigger === "avatar" ? (
            <span
              className={`flex items-center justify-center rounded-full text-xs font-semibold uppercase text-white ${innerSizeClass}`}
              style={{ backgroundColor: fallback.color }}
            >
              {hasProfileInfo ? fallback.initials : ""}
            </span>
          ) : null}
        </button>

        <div
          className={
            "absolute right-0 z-40 mt-3 w-[280px] rounded-xl border border-[#E5E7EB] bg-white p-3 text-left shadow-[0_16px_36px_rgba(15,23,42,0.14)] origin-top-right transition duration-200 ease-out dark:border-[#3F3F3F] dark:bg-[#323232] dark:shadow-[0_20px_44px_rgba(0,0,0,0.5)] " +
            (open
              ? "pointer-events-auto opacity-100 translate-y-0 scale-100"
              : "pointer-events-none opacity-0 translate-y-1 scale-95")
          }
        >
        <div className={`space-y-3 text-sm text-slate-700 dark:text-zinc-100 ${open ? "avatar-dropdown-menu" : ""}`}>
            <div className="flex items-center gap-3 px-3 py-2.5">
              {showAvatarImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar!}
                  alt="Your avatar"
                  className="h-11 w-11 rounded-md object-cover"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : showProfileSkeleton ? (
                <span className="h-11 w-11 rounded-md bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
              ) : (
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-md text-base font-semibold uppercase text-white"
                  style={{ backgroundColor: fallback.color }}
                >
                  {hasProfileInfo ? fallback.initials : ""}
                </span>
              )}
              {showProfileSkeleton ? (
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-32 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                  <div className="h-3.5 w-40 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                </div>
              ) : hasProfileInfo ? (
                <div className="min-w-0">
                  {profileName ? (
                    <p className="max-w-[190px] truncate text-base font-semibold text-[#0F172A] dark:text-zinc-100">
                      {profileName}
                    </p>
                  ) : null}
                  {profileEmail ? (
                    <p className="max-w-[190px] truncate text-sm text-[#64748B] dark:text-zinc-300">
                      {profileEmail}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="border-t border-[#E6EBF2] pt-2 dark:border-[#3F3F3F]">
              {billingStatusLoading ? (
                <div className="mb-2 h-[48px] w-full rounded-md bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
              ) : shouldShowUpdatePaymentCta ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleBillingPortal();
                  }}
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-md bg-rose-600 px-3 py-2.5 text-[15px] font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/45 focus:ring-offset-2 focus:ring-offset-white dark:bg-rose-600 dark:hover:bg-rose-700 dark:focus:ring-offset-zinc-900"
                  >
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  Update payment method
                </button>
              ) : shouldShowUpgradePlanCta ? (
                <button
                  type="button"
                  onClick={handlePricing}
                  className="group relative mb-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg border border-[#CFC4FF] bg-gradient-to-r from-[#8B5CF6] via-[#7C4DFF] to-[#6D5EF7] px-3 py-2.5 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(108,71,255,0.16)] transition duration-200 hover:-translate-y-px hover:border-[#B8A6FF] hover:shadow-[0_10px_18px_rgba(108,71,255,0.24)] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/35 focus:ring-offset-2 focus:ring-offset-white dark:border-[#6D5EF7]/35 dark:shadow-[0_8px_18px_rgba(76,29,149,0.24)] dark:hover:border-[#8A74FF]/45 dark:hover:shadow-[0_12px_22px_rgba(76,29,149,0.32)] dark:focus:ring-offset-zinc-900"
                >
                  <Sparkles className="relative z-10 h-4 w-4 text-white/90" aria-hidden />
                  <span className="relative z-10">Upgrade plan</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleProjects}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-100 dark:hover:bg-[#3A3A3A]/70 dark:hover:text-white dark:focus:ring-offset-[#323232]"
              >
                <Folders className="h-4 w-4 text-current" aria-hidden />
                <span>All projects</span>
              </button>
              <button
                type="button"
                onClick={handleSignatures}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-100 dark:hover:bg-[#3A3A3A]/70 dark:hover:text-white dark:focus:ring-offset-[#323232]"
              >
                <PenLine className="h-4 w-4 text-current" aria-hidden />
                <span>Signatures</span>
              </button>
              <button
                type="button"
                onClick={handleAccountSettings}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-100 dark:hover:bg-[#3A3A3A]/70 dark:hover:text-white dark:focus:ring-offset-[#323232]"
              >
                <Settings className="h-4 w-4 text-current" aria-hidden />
                <span>Account Settings</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleBillingPortal();
                }}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-100 dark:hover:bg-[#3A3A3A]/70 dark:hover:text-white dark:focus:ring-offset-[#323232]"
              >
                <CreditCard className="h-4 w-4 text-current" aria-hidden />
                <span>Billing portal</span>
              </button>
              <button
                type="button"
                onClick={handleHelpCenter}
                className="group flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-100 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
              >
                <span className="flex items-center gap-3">
                  <CircleHelp className="h-4 w-4 text-current" aria-hidden />
                  <span>Help Center</span>
                </span>
                <ExternalLink
                  className="h-4 w-4 text-[#94A3B8] transition group-hover:text-[#64748B] dark:text-zinc-500 dark:group-hover:text-zinc-300"
                  aria-hidden
                />
              </button>
            </div>

            <div className="border-t border-[#E6EBF2] pt-2 dark:border-[#3F3F3F]">
              <div className="px-3 py-2">
                <div className="relative grid h-10 w-full grid-cols-2 gap-1 rounded-lg border border-gray-300 bg-white p-1 dark:border-[#3F3F3F] dark:bg-[#2B2B2B]">
                    <span
                      aria-hidden
                      suppressHydrationWarning
                      className={`absolute inset-y-1 left-1 w-[calc(50%-6px)] rounded-md bg-[#1F2937] shadow-sm transition-transform dark:bg-white ${
                        themeHydrated && theme === "dark" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => applyTheme("light")}
                      aria-pressed={theme === "light"}
                      className={`relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-md px-1.5 py-2 text-sm font-medium leading-[1.15] transition ${
                        theme === "light"
                          ? "text-white dark:text-zinc-950"
                          : "text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-[#3A3A3A]"
                      }`}
                    >
                      <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTheme("dark")}
                      aria-pressed={theme === "dark"}
                      className={`relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-md px-1.5 py-2 text-sm font-medium leading-[1.15] transition ${
                        theme === "dark"
                          ? "text-white dark:text-zinc-950"
                          : "text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-[#3A3A3A]"
                      }`}
                    >
                      <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">Dark</span>
                    </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                aria-disabled={busy}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#B91C1C] transition hover:bg-red-50 hover:text-[#991B1B] active:scale-[0.99] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:ring-offset-2 focus:ring-offset-white dark:text-red-400 dark:hover:bg-[#3A3A3A]/70 dark:hover:text-red-300 dark:focus:ring-offset-[#323232]"
              >
                <LogOut className="h-4 w-4 text-current" aria-hidden />
                <span>{busy ? "Logging out..." : "Log out"}</span>
              </button>
            </div>
        </div>
      </div>
      </div>
      {billingPortalPending && typeof document !== "undefined"
        ? createPortal(
          <div className="pointer-events-none fixed inset-0 z-[1200]">
            <div className="absolute inset-0 bg-white dark:bg-[#252525]" />
            <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
              <div className="pointer-events-none flex flex-col items-center text-center">
                <div
                  className="h-14 w-14 animate-spin rounded-full border-[5px] border-[#D9CCFF] border-t-[#6C47FF] dark:border-[#3F3F3F] dark:border-t-[#8B6CFF]"
                  aria-hidden
                />
                <p className="mt-5 text-[24px] font-semibold tracking-tight text-slate-900 dark:text-[#F5F5F5] sm:text-[28px]">
                  Opening Billing Portal...
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
