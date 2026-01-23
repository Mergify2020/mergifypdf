"use client";

import { usePathname } from "next/navigation";

const AUTH_FOOTER_ROUTES = new Set(["/login", "/register"]);
const LOGIN_ROUTE = "/login";

export default function AuthFooter() {
  const pathname = usePathname();

  if (!AUTH_FOOTER_ROUTES.has(pathname)) {
    return null;
  }

  const isLogin = pathname === LOGIN_ROUTE;

  return (
    <footer
      className={
        isLogin
          ? "fixed bottom-0 left-0 z-50 flex h-[46px] w-full items-center justify-center bg-white px-4 text-center text-[13px] leading-4 text-slate-700/90"
          : "flex h-[34px] w-full items-center justify-center px-4 text-center text-[13.5px] leading-none text-slate-600/75"
      }
    >
      <div className={`flex items-center justify-center gap-2 whitespace-nowrap ${isLogin ? "font-medium" : ""}`}>
        <span>Copyright © 2026 MergifyPDF. All rights reserved</span>
        <span className={isLogin ? "text-slate-500/70 leading-[18px]" : "text-slate-500/60"}>|</span>
        <span>Privacy Policy</span>
        <span className={isLogin ? "text-slate-500/70 leading-[18px]" : "text-slate-500/60"}>|</span>
        <span>Terms of Service</span>
      </div>
    </footer>
  );
}
