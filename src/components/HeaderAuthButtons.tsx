"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HeaderAuthButtons() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";

  return (
    <div className="flex items-center gap-3">
      {/* Pricing pill - always visible */}
      <Link
        href="/account?view=pricing"
        className="inline-flex items-center rounded-full border-2 border-slate-300 bg-[#6A4EE8] px-7 py-2 text-xs font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#5A3FD8] hover:shadow-lg"
      >
        Pricing
      </Link>

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

      {/* Mobile menu (vertical phones) */}
      <div className="relative sm:hidden">
        <details className="group">
          <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-slate-300 bg-white/80 text-slate-800 shadow-sm transition hover:bg-white">
            <span className="sr-only">Account menu</span>
            <span className="flex flex-col gap-[3px]">
              <span className="h-[2px] w-4 rounded bg-slate-700" />
              <span className="h-[2px] w-4 rounded bg-slate-700" />
              <span className="h-[2px] w-4 rounded bg-slate-700" />
            </span>
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-36 rounded-xl border border-slate-200 bg-white/95 py-2 shadow-lg">
            {!isLoginPage && (
              <Link
                href="/login"
                className="block px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
              >
                Log in
              </Link>
            )}
            {!isRegisterPage && (
              <Link
                href="/register"
                className="block px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
              >
                Sign up
              </Link>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

