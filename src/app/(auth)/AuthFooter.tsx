"use client";

import { usePathname } from "next/navigation";

const AUTH_FOOTER_ROUTES = new Set(["/login", "/register", "/forgot-password"]);
const LOGIN_ROUTE = "/login";

export default function AuthFooter() {
  const pathname = usePathname();

  if (!AUTH_FOOTER_ROUTES.has(pathname)) {
    return null;
  }

  const isLogin = pathname === LOGIN_ROUTE;
  const isRegister = pathname === "/register";
  const isForgotPassword = pathname === "/forgot-password";
  const usesFixedFooter = isLogin || isRegister || isForgotPassword;

  return (
    <footer
      className={
        usesFixedFooter
          ? "fixed bottom-0 left-0 z-50 flex h-[46px] w-full items-center justify-center bg-white px-4 text-center text-[13px] leading-4 text-slate-700/90"
          : "flex h-[34px] w-full items-center justify-center px-4 text-center text-[13.5px] leading-none text-slate-600/75"
      }
    >
      <div
        className={`flex flex-col items-center justify-center gap-1 ${usesFixedFooter ? "font-medium" : ""} sm:flex-row sm:gap-2 sm:whitespace-nowrap`}
      >
        <div className="flex items-center gap-2 sm:hidden">
          <span>Privacy Policy</span>
          <span className={usesFixedFooter ? "text-slate-500/70 leading-[18px]" : "text-slate-500/60"}>|</span>
          <span>Terms of Service</span>
        </div>
        <span className="text-[13px] font-normal sm:font-medium sm:hidden">
          Copyright © 2026 MergifyPDF. All rights reserved
        </span>
        <div className="hidden items-center gap-2 sm:flex">
          <span>Copyright © 2026 MergifyPDF. All rights reserved</span>
          <span className={usesFixedFooter ? "text-slate-500/70 leading-[18px]" : "text-slate-500/60"}>|</span>
          <span>Privacy Policy</span>
          <span className={usesFixedFooter ? "text-slate-500/70 leading-[18px]" : "text-slate-500/60"}>|</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}
