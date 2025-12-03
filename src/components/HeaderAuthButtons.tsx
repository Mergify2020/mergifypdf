"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function HeaderAuthButtons() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";
  const isHome = pathname === "/";
  const isPricingPage = pathname === "/account" && searchParams.get("view") === "pricing";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClick(event: MouseEvent | TouchEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [menuOpen]);

  return (
    <div className="flex items-center gap-3">
      {/* Pricing pill - hidden on pricing page */}
      {!isPricingPage && (
        <Link
          href="/account?view=pricing"
          className="inline-flex items-center rounded-full border-2 border-slate-300 bg-[#6A4EE8] px-7 py-2 text-xs font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#5A3FD8] hover:shadow-lg"
        >
          Pricing
        </Link>
      )}

      {/* Desktop / tablet auth buttons */}
      <div className="hidden items-center gap-3 sm:flex">
        {!isRegisterPage && (
          <Link
            href="/register"
            className="inline-flex items-center rounded-full border border-slate-300 bg-transparent px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/70"
          >
            Sign up
          </Link>
        )}
        {!isLoginPage && (
          <Link
            href="/login"
            className="inline-flex items-center rounded-full border border-slate-300 bg-transparent px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/70"
          >
            Log in
          </Link>
        )}
      </div>

      {/* Mobile behaviour */}
      {isHome ? (
        // On the hero page only, use a hamburger dropdown for mobile
        <div ref={menuRef} className="relative sm:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
            aria-label="Account menu"
            aria-expanded={menuOpen}
          >
            <span className="flex flex-col gap-[3px]">
              <span className="h-[2px] w-4 rounded bg-slate-700" />
              <span className="h-[2px] w-4 rounded bg-slate-700" />
              <span className="h-[2px] w-4 rounded bg-slate-700" />
            </span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-3 w-44 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-[0_18px_45px_rgba(15,23,42,0.35)] backdrop-blur-md">
              <p className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Account
              </p>
              {/* On hero we always want both options */}
              <Link
                href="/login"
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                onClick={() => setMenuOpen(false)}
              >
                <span>Log in</span>
                <span className="text-[10px] text-slate-400">Existing</span>
              </Link>
              <Link
                href="/register"
                className="mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                onClick={() => setMenuOpen(false)}
              >
                <span>Sign up</span>
                <span className="text-[10px] text-slate-400">New</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        // On all other pages (including login/register), show inline buttons on mobile too
        <div className="flex items-center gap-3 sm:hidden">
          {!isRegisterPage && (
            <Link
              href="/register"
              className="inline-flex items-center rounded-full border border-slate-300 bg-transparent px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/70"
            >
              Sign up
            </Link>
          )}
          {!isLoginPage && (
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-slate-300 bg-transparent px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/70"
            >
              Log in
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
