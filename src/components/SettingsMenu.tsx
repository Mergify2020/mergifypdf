"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  CreditCard,
  FolderKanban,
  HelpCircle,
  LogOut,
  PenSquare,
  User,
} from "lucide-react";
import { useAvatarPreference } from "@/lib/useAvatarPreference";

export default function SettingsMenu() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const avatarKey = session?.user?.email ?? session?.user?.id ?? null;
  const { avatar } = useAvatarPreference(avatarKey);

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

  function handleAccount() {
    setOpen(false);
    router.push("/account");
  }

  function handlePricing() {
    setOpen(false);
    router.push("/account?view=pricing");
  }

  function handleProjectsDashboard() {
    setOpen(false);
    router.push("/");
  }

  function handleSignatureDashboard() {
    setOpen(false);
    router.push("/signature-center");
  }

  async function handleSignOut() {
    if (busy) return;
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;
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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#024d7c] active:scale-[0.96] active:shadow-sm"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="sr-only">Open profile menu</span>
        <img
          src={avatar || "/Defaultpfp.svg"}
          alt="Your avatar"
          className="h-9 w-9 rounded-full object-cover"
        />
      </button>

      <div
        className={`absolute right-0 z-40 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl origin-top-right transition duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "pointer-events-auto opacity-100 translate-y-0 scale-100" : "pointer-events-none opacity-0 translate-y-1 scale-[0.98]"
        }`}
      >
          <div className="space-y-4 text-sm text-slate-700">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <img src={avatar || "/Defaultpfp.svg"} alt="Your avatar" className="h-12 w-12 rounded-full object-cover" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {session?.user?.name ?? "Mergify user"}
                </p>
                {session?.user?.email && (
                  <p className="text-xs text-slate-500">{session.user.email}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Profile
              </p>
              <button
                type="button"
                onClick={handleAccount}
                className="group flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-[#F5F7FA] hover:text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#024d7c]"
              >
                <User className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-px" aria-hidden />
                <span>Profile / Account Settings</span>
              </button>
            </div>

            <div className="space-y-1 border-t border-slate-200 pt-3">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Navigation
              </p>
              <button
                type="button"
                onClick={handleProjectsDashboard}
                className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-[#F5F7FA] hover:text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#024d7c]"
              >
                <FolderKanban className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-px" aria-hidden />
                <span>Projects Dashboard</span>
              </button>
              <button
                type="button"
                onClick={handleSignatureDashboard}
                className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-[#F5F7FA] hover:text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#024d7c]"
              >
                <PenSquare className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-px" aria-hidden />
                <span>Signature Dashboard</span>
              </button>
            </div>

            <div className="space-y-1 border-t border-slate-200 pt-3">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Account
              </p>
              <button
                type="button"
                onClick={handlePricing}
                className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-[#F5F7FA] hover:text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#024d7c]"
              >
                <CreditCard className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-px" aria-hidden />
                <span>Subscription &amp; Billing</span>
              </button>
              <button
                type="button"
                disabled
                className="group flex w-full cursor-default items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-400 transition hover:bg-[#F5F7FA]"
              >
                <HelpCircle className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-px" aria-hidden />
                <span>Help &amp; Support</span>
              </button>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                aria-disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#B91C1C] hover:shadow-[0_4px_10px_rgba(220,38,38,0.35)] active:scale-[0.97] active:shadow-[0_2px_6px_rgba(220,38,38,0.25)] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#DC2626]"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span>Log out</span>
              </button>
              <div className="mt-3 flex justify-between px-1 text-[10px] tracking-[0.2px] text-slate-400/60">
                <span className="rounded px-1 py-0.5 transition hover:bg-[#F5F7FA] hover:text-[#1F2937]">
                  Terms &amp; Conditions
                </span>
                <span className="rounded px-1 py-0.5 transition hover:bg-[#F5F7FA] hover:text-[#1F2937]">
                  Privacy Policy
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
