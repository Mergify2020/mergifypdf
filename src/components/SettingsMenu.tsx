"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { CreditCard, LogOut, User } from "lucide-react";
import { useAvatarPreference } from "@/lib/useAvatarPreference";
import { getAvatarFallback } from "@/lib/avatarFallback";

export default function SettingsMenu() {
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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800 active:scale-95 active:shadow-sm"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="sr-only">Open profile menu</span>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="Your avatar" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold uppercase text-white"
            style={{ backgroundColor: fallback.color }}
          >
            {fallback.initials}
          </span>
        )}
      </button>

      <div
        className={
          "absolute right-0 z-40 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl origin-top-right transition duration-200 ease-out " +
          (open
            ? "pointer-events-auto opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 translate-y-1 scale-95")
        }
      >
        <div className="space-y-4 text-sm text-slate-700">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="Your avatar" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold uppercase text-white"
                  style={{ backgroundColor: fallback.color }}
                >
                  {fallback.initials}
                </span>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {session?.user?.name ?? "Mergify user"}
                </p>
                {session?.user?.email && (
                  <p className="text-xs text-slate-500">{session.user.email}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={handlePricing}
                className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800"
              >
                <CreditCard className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-px" aria-hidden />
                <span>Subscription &amp; Billing</span>
              </button>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                aria-disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 hover:shadow-md active:scale-95 active:shadow disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600"
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
