"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
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

  async function handleSignOut() {
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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#024d7c]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="sr-only">Open profile menu</span>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="Your avatar" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/Defaultpfp.svg" alt="Default avatar" className="h-9 w-9 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xl shadow-slate-900/15">
          <div className="space-y-4 text-sm text-slate-700">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="Your avatar" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/Defaultpfp.svg" alt="Default avatar" className="h-12 w-12 rounded-full" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {session?.user?.name ?? "Mergify user"}
                </p>
                {session?.user?.email ? (
                  <p className="text-xs text-slate-500">{session.user.email}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={handleAccount}
                className="rounded-lg px-3 py-2 text-left font-medium text-slate-800 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#024d7c]"
              >
                Account
              </button>
              <button
                type="button"
                disabled
                className="rounded-lg px-3 py-2 text-left font-medium text-slate-400"
              >
                Signatures (soon)
              </button>
              <button
                type="button"
                onClick={handlePricing}
                className="rounded-lg px-3 py-2 text-left font-medium text-slate-800 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#024d7c]"
              >
                Plans &amp; pricing
              </button>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                aria-disabled={busy}
                className="w-full rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
