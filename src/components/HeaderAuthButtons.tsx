"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderMobileMenu from "@/components/HeaderMobileMenu";

export default function HeaderAuthButtons() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";

  const markSkipFeatureScroll = () => {
    try {
      window.sessionStorage.setItem("skipFeatureAutoScroll", "1");
    } catch {
      // no-op
    }
  };

  return (
      <div className="flex items-center gap-3 ml-auto">
      {/* Desktop / tablet auth buttons */}
      <div className="hidden items-center gap-3 min-[700px]:flex">
        {!isLoginPage && (
          <Link
            href="/login"
            onClick={markSkipFeatureScroll}
            className="hero-auth-link inline-flex items-center text-sm font-semibold transition"
          >
            Log in
          </Link>
        )}
        {!isRegisterPage && (
          <Link
            href="/register"
            onClick={markSkipFeatureScroll}
            className="hero-auth-cta inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-white/20 bg-[#6D5EF3] px-3.5 text-sm font-semibold leading-none text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_10px_18px_rgba(109,94,243,0.24)] ring-1 ring-white/20 transition hover:-translate-y-0.5"
          >
            <span className="relative z-10">Sign Up</span>
          </Link>
        )}
      </div>

      {/* Mobile behaviour */}
      <div className="flex items-center gap-2 min-[700px]:hidden">
        {!isRegisterPage && (
          <Link
            href="/register"
            onClick={markSkipFeatureScroll}
            className="hero-auth-cta inline-flex h-8 items-center gap-1.5 rounded-[12px] border border-white/20 bg-[#6D5EF3] px-3 text-sm font-semibold leading-none text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_10px_18px_rgba(109,94,243,0.24)] ring-1 ring-white/20 transition hover:-translate-y-0.5 min-[715px]:gap-2"
          >
            <span className="relative z-10 min-[700px]:inline">Sign Up</span>
          </Link>
        )}
        <HeaderMobileMenu />
      </div>
    </div>
  );
}
