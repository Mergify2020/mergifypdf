"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { CircleHelp, CreditCard, LogOut, Settings, User } from "lucide-react";
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
  const avatarKey = session?.user?.email ?? session?.user?.id ?? null;
  const { avatar } = useAvatarPreference(avatarKey);
  const fallback = getAvatarFallback(
    avatarKey,
    session?.user?.name ?? session?.user?.email ?? "User"
  );

  const outerSizeClass = variant === "pricing" ? "h-12 w-12" : "h-9 w-9";
  const innerSizeClass = variant === "pricing" ? "h-11 w-11" : "h-8 w-8";

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

  function handleAccountSettings() {
    setOpen(false);
    router.push("/account");
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

  return (
    <div ref={containerRef} className="relative">
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
        ) : trigger === "avatar" && avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="Your avatar" className={`${innerSizeClass} rounded-full object-cover`} />
        ) : trigger === "avatar" ? (
          <span
            className={`flex items-center justify-center rounded-full text-xs font-semibold uppercase text-white ${innerSizeClass}`}
            style={{ backgroundColor: fallback.color }}
          >
            {fallback.initials}
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
        <div className="space-y-3 text-sm text-slate-700 dark:text-zinc-200">
            <div className="flex items-center gap-3 rounded-md bg-[#F8FAFC] px-3 py-2.5 dark:bg-zinc-800/70">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="Your avatar" className="h-11 w-11 rounded-md object-cover" />
              ) : (
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-md text-base font-semibold uppercase text-white"
                  style={{ backgroundColor: fallback.color }}
                >
                  {fallback.initials}
                </span>
              )}
              <div>
                <p className="text-base font-semibold text-[#0F172A] dark:text-zinc-100">
                  {session?.user?.name ?? "Mergify user"}
                </p>
                {session?.user?.email && (
                  <p className="text-sm text-[#64748B] dark:text-zinc-400">{session.user.email}</p>
                )}
              </div>
            </div>

            <div className="border-t border-[#E6EBF2] pt-2 dark:border-zinc-700">
              <button
                type="button"
                onClick={handleAccountSettings}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-100 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
              >
                <Settings className="h-4 w-4 text-[#64748B] dark:text-zinc-400" aria-hidden />
                <span>Account Settings</span>
              </button>
              <button
                type="button"
                onClick={handlePricing}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-100 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
              >
                <CreditCard className="h-4 w-4 text-[#64748B] dark:text-zinc-400" aria-hidden />
                <span>Subscription &amp; Billing</span>
              </button>
              <button
                type="button"
                onClick={handleHelpCenter}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-[#1E293B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-100 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
              >
                <CircleHelp className="h-4 w-4 text-[#64748B] dark:text-zinc-400" aria-hidden />
                <span>Help Center</span>
              </button>
            </div>

            <div className="border-t border-[#E6EBF2] pt-2 dark:border-zinc-700">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                aria-disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#1E293B] px-3 py-2.5 text-[15px] font-medium text-white transition hover:bg-[#0F172A] active:scale-[0.99] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#1E293B]/35 focus:ring-offset-2 focus:ring-offset-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-offset-zinc-900"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span>Log out</span>
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
