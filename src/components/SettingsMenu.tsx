"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAvatarPreference } from "@/lib/useAvatarPreference";

type ThemeOption = "light" | "dark";

export default function SettingsMenu() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<ThemeOption>("light");
  const { avatar } = useAvatarPreference();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("mergify-theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mergify-theme", theme);
    }
  }, [theme]);

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

  function handleThemeChange(nextTheme: ThemeOption) {
    setTheme(nextTheme);
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
          <span aria-hidden className="inline-block h-9 w-9 rounded-full bg-black" />
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
                <div className="h-12 w-12 rounded-full bg-black/80" aria-hidden="true" />
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

            <div className="space-y-2 rounded-2xl border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Theme
                </p>
                <span className="text-xs text-white/60">
                  {theme === "dark" ? "Night mode" : "Daylight"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["light", "dark"] as ThemeOption[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleThemeChange(option)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold capitalize transition ${
                      theme === option
                        ? "bg-white text-[#050915]"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {option}
                    <span aria-hidden>{option === "dark" ? "🌙" : "☀️"}</span>
                  </button>
                ))}
              </div>
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
