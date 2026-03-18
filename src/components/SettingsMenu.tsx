"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AlertTriangle, CircleHelp, CreditCard, ExternalLink, Folders, LogOut, PenLine, Settings, User } from "lucide-react";
import { useAvatarPreference } from "@/lib/useAvatarPreference";
import { getAvatarFallback } from "@/lib/avatarFallback";

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
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);
  const [stripeStatus, setStripeStatus] = useState<string | null>(null);
  const avatarKey = session?.user?.id ?? session?.user?.email ?? null;
  const { avatar } = useAvatarPreference(avatarKey);
  const profileName = (session?.user?.name ?? "").trim();
  const profileEmail = (session?.user?.email ?? "").trim();
  const hasProfileInfo = Boolean(profileName || profileEmail);
  const fallback = getAvatarFallback(avatarKey, profileName || profileEmail || null);

  const outerSizeClass = variant === "pricing" ? "h-12 w-12" : "h-9 w-9";
  const innerSizeClass = variant === "pricing" ? "h-11 w-11" : "h-8 w-8";
  const showAvatarImage = Boolean(avatar) && !avatarLoadFailed;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatar]);

  useEffect(() => {
    let active = true;
    async function loadPlanStatus() {
      if (!session?.user?.email) {
        if (active) setHasActivePlan(false);
        return;
      }
      try {
        const response = await fetch("/api/account/trial-status");
        if (!response.ok) {
          if (active) {
            setHasActivePlan(false);
            setStripeStatus(null);
          }
          return;
        }
        const data = (await response.json()) as { hasActivePlan?: boolean; stripeStatus?: string | null };
        if (active) {
          setHasActivePlan(data.hasActivePlan === true);
          setStripeStatus(typeof data.stripeStatus === "string" ? data.stripeStatus : null);
        }
      } catch {
        if (active) {
          setHasActivePlan(false);
          setStripeStatus(null);
        }
      }
    }
    void loadPlanStatus();
    return () => {
      active = false;
    };
  }, [session?.user?.email]);

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
    setOpen((prev) => !prev);
  }

  function handlePricing() {
    setOpen(false);
    router.push("/pricing");
  }

  async function handleBillingPortal() {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("workspace-billing-portal-start"));
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("workspace-billing-portal-stop"));
    }
    router.push("/account?view=security");
  }

  function handleAccountSettings() {
    setOpen(false);
    router.push("/account");
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

  const shouldShowUpdatePaymentCta = stripeStatus === "past_due" || stripeStatus === "unpaid";

  return (
    <div
      ref={containerRef}
      className={`relative ${trigger === "custom" ? "w-full min-w-0" : ""}`}
    >
      <button
        type="button"
        onClick={handleToggle}
        className={
          trigger === "custom"
            ? (triggerClassName ??
              "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800 active:scale-[0.99]")
            : `flex items-center justify-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800 active:scale-95 ${outerSizeClass} ${triggerClassName ?? ""}`
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
          "absolute right-0 z-40 mt-3 w-[280px] rounded-xl border border-[#E5E7EB] bg-white p-3 text-left shadow-[0_16px_36px_rgba(15,23,42,0.14)] origin-top-right transition duration-200 ease-out dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_20px_44px_rgba(0,0,0,0.5)] " +
          (open
            ? "pointer-events-auto opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 translate-y-1 scale-95")
        }
      >
        <div className={`space-y-3 text-sm text-slate-700 dark:text-zinc-200 ${open ? "avatar-dropdown-menu" : ""}`}>
            <div className="flex items-center gap-3 px-3 py-2.5">
              {showAvatarImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar!}
                  alt="Your avatar"
                  className="h-11 w-11 rounded-md object-cover"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-md text-base font-semibold uppercase text-white"
                  style={{ backgroundColor: fallback.color }}
                >
                  {hasProfileInfo ? fallback.initials : ""}
                </span>
              )}
              {hasProfileInfo ? (
                <div className="min-w-0">
                  {profileName ? (
                    <p className="max-w-[190px] truncate text-base font-semibold text-[#0F172A] dark:text-zinc-100">
                      {profileName}
                    </p>
                  ) : null}
                  {profileEmail ? (
                    <p className="max-w-[190px] truncate text-sm text-[#64748B] dark:text-zinc-400">
                      {profileEmail}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="border-t border-[#E6EBF2] pt-2 dark:border-zinc-700">
              {shouldShowUpdatePaymentCta ? (
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
              ) : hasActivePlan === false ? (
                <button
                  type="button"
                  onClick={handlePricing}
                  className="mb-2 flex w-full items-center justify-center rounded-md bg-[#6C47FF] px-3 py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#5B38E6] focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/40 focus:ring-offset-2 focus:ring-offset-white dark:bg-[#6C47FF] dark:hover:bg-[#5B38E6] dark:focus:ring-offset-zinc-900"
                >
                  Upgrade plan
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleProjects}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-100 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
              >
                <Folders className="h-4 w-4 text-current" aria-hidden />
                <span>All projects</span>
              </button>
              <button
                type="button"
                onClick={handleSignatures}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-100 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
              >
                <PenLine className="h-4 w-4 text-current" aria-hidden />
                <span>Signatures</span>
              </button>
              <button
                type="button"
                onClick={handleAccountSettings}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-100 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
              >
                <Settings className="h-4 w-4 text-current" aria-hidden />
                <span>Account Settings</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleBillingPortal();
                }}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-100 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
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

            <div className="border-t border-[#E6EBF2] pt-2 dark:border-zinc-700">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                aria-disabled={busy}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#B91C1C] transition hover:bg-red-50 hover:text-[#991B1B] active:scale-[0.99] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:ring-offset-2 focus:ring-offset-white dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300 dark:focus:ring-offset-zinc-900"
              >
                <LogOut className="h-4 w-4 text-current" aria-hidden />
                <span>{busy ? "Logging out..." : "Log out"}</span>
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
