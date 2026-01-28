"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import HeaderMobileMenu from "@/components/HeaderMobileMenu";

export default function HeaderAuthButtons() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";
  const isPricingPage = pathname === "/account" && searchParams.get("view") === "pricing";

  return (
      <div className="flex items-center gap-3 ml-auto">
      {/* Desktop / tablet auth buttons */}
      <div className="hidden items-center gap-3 min-[700px]:flex">
        {!isLoginPage && (
          <Link
            href="/login"
            className="inline-flex items-center text-base font-semibold text-slate-700 transition hover:text-slate-900"
          >
            Log in
          </Link>
        )}
        {!isRegisterPage && (
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Start free trial
            <span aria-hidden>→</span>
          </Link>
        )}
      </div>

      {/* Mobile behaviour */}
      <div className="flex items-center gap-2 min-[700px]:hidden">
        {!isRegisterPage && (
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 min-[715px]:gap-2"
          >
            <span className="min-[700px]:inline">Start free trial</span>
            <span className="hidden min-[700px]:inline" aria-hidden>
              →
            </span>
          </Link>
        )}
        <HeaderMobileMenu />
      </div>
    </div>
  );
}
