"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

type ThemeOption = "light" | "dark";

export default function SettingsMenu() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<ThemeOption>("light");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
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
        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-black text-white shadow-sm transition hover:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#024d7c]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="sr-only">Open profile menu</span>
        <span aria-hidden className="inline-block h-9 w-9 rounded-full bg-black" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white/95 p-4 text-left shadow-2xl shadow-slate-900/10">
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-12 w-12 rounded-full bg-black" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Profile</p>
                <p className="text-xs text-slate-500">Default avatar</p>
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
                disabled
                className="rounded-lg px-3 py-2 text-left font-medium text-slate-400"
              >
                Plans &amp; pricing (soon)
              </button>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Theme
                </p>
                <span className="text-xs text-slate-500">{theme === "dark" ? "Dark" : "Light"} mode</span>
              </div>
              <div className="flex gap-2">
                {(["light", "dark"] as ThemeOption[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleThemeChange(option)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition ${
                      theme === option
                        ? "border-[#024d7c] bg-[#024d7c]/10 text-[#024d7c]"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                aria-disabled={busy}
                className="w-full rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
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
