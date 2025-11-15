"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAvatarPreference } from "@/lib/useAvatarPreference";

export default function SettingsMenu() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { avatar } = useAvatarPreference();

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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-black text-white shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#024d7c]"
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
        <div className="absolute right-0 z-40 mt-3 w-72 rounded-2xl border border-white/10 bg-[#070b16]/95 p-4 text-left shadow-[0_30px_90px_rgba(0,0,0,0.65)] backdrop-blur">
          <div className="space-y-4 text-sm text-white/80">
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="Your avatar" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/Defaultpfp.svg" alt="Default avatar" className="h-12 w-12 rounded-full" />
              )}
              <div>
                <p className="text-sm font-semibold text-white">mergify user</p>
                <p className="text-xs text-white/60">Default avatar</p>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={handleAccount}
                className="rounded-lg px-3 py-2 text-left font-medium text-white transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/70 focus-visible:ring-offset-[#070b16]"
              >
                Account
              </button>
              <button
                type="button"
                disabled
                className="rounded-lg px-3 py-2 text-left font-medium text-white/40"
              >
                Signatures (soon)
              </button>
              <button
                type="button"
                disabled
                className="rounded-lg px-3 py-2 text-left font-medium text-white/40"
              >
                Plans &amp; pricing (soon)
              </button>
            </div>

            <div className="border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                aria-disabled={busy}
                className="w-full rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/50 focus-visible:ring-offset-[#070b16]"
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
