"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HeaderFeaturesLink from "@/components/HeaderFeaturesLink";

export default function HeaderMobileMenu() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
  
  useEffect(() => {
    if (!menuOpen) return;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevOverflowX = body.style.overflowX;
    body.style.overflow = "hidden";
    body.style.overflowX = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
      body.style.overflowX = prevOverflowX;
    };
  }, [menuOpen]);


  return (
    <div ref={menuRef} className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex h-10 w-10 items-center justify-center text-slate-800 transition hover:-translate-y-0.5"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? (
          <span className="relative h-6 w-6">
            <span className="absolute left-0 top-1/2 h-[2px] w-6 -translate-y-1/2 rotate-45 rounded bg-slate-800" />
            <span className="absolute left-0 top-1/2 h-[2px] w-6 -translate-y-1/2 -rotate-45 rounded bg-slate-800" />
          </span>
        ) : (
          <span className="flex flex-col gap-[4px]">
            <span className="h-[2px] w-6 rounded bg-slate-800" />
            <span className="h-[2px] w-6 rounded bg-slate-800" />
            <span className="h-[2px] w-6 rounded bg-slate-800" />
          </span>
        )}
      </button>
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="absolute inset-0 bg-transparent"
          aria-label="Close menu"
        />
        <div className="absolute left-0 right-0 bottom-0 top-[76px] bg-transparent" />
        <div
          className={`fixed top-0 right-0 z-[61] h-screen w-[75vw] max-w-[520px] rounded-l-[18px] bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.04),-18px_0_45px_rgba(15,23,42,0.12)] transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-5">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="z-[62] flex h-10 w-10 items-center justify-center text-slate-800 transition hover:-translate-y-0.5"
                aria-label="Close menu"
              >
                <span className="sr-only">Close menu</span>
                <span className="relative h-6 w-6">
                  <span className="absolute left-0 top-1/2 h-[2px] w-6 -translate-y-1/2 rotate-45 rounded bg-slate-800" />
                  <span className="absolute left-0 top-1/2 h-[2px] w-6 -translate-y-1/2 -rotate-45 rounded bg-slate-800" />
                </span>
              </button>
            </div>
            <nav className="flex flex-col gap-7 px-6 py-8 text-lg font-semibold text-slate-900">
              <Link
                href="/pricing"
                onClick={() => setMenuOpen(false)}
                className="group flex items-center rounded-xl px-2 py-3 transition hover:bg-slate-50 active:bg-slate-100"
              >
                <span className="transition-transform duration-200 group-hover:translate-x-1 group-active:translate-x-0.5">
                  Pricing
                </span>
              </Link>
              <HeaderFeaturesLink
                className="cursor-pointer rounded-xl px-2 py-3 text-slate-800 transition-transform duration-200 hover:translate-x-1 hover:bg-slate-50 active:translate-x-0.5 active:bg-slate-100"
                onNavigate={() => setMenuOpen(false)}
              />
              <span className="cursor-pointer rounded-xl px-2 py-3 text-slate-800 transition-transform duration-200 hover:translate-x-1 hover:bg-slate-50 active:translate-x-0.5 active:bg-slate-100">
                About
              </span>
              <span className="cursor-pointer rounded-xl px-2 py-3 text-slate-800 transition-transform duration-200 hover:translate-x-1 hover:bg-slate-50 active:translate-x-0.5 active:bg-slate-100">
                Contact
              </span>

              <div className="mt-6 border-t border-slate-200/80 pt-6" />
              {!isLoginPage ? (
                <>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-[12px] bg-[#6D5EF3] px-4 py-2.5 text-base font-semibold text-white shadow-[0_12px_24px_rgba(109,94,243,0.25)] transition hover:-translate-y-0.5 hover:bg-[#7567F5] active:translate-y-0.5 active:bg-[#6354E6] active:shadow-[0_8px_16px_rgba(109,94,243,0.18)]"
                  >
                    Start free trial
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="mt-3 inline-flex items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 active:translate-y-0.5 active:border-slate-300 active:bg-slate-100 active:shadow-none"
                  >
                    Log in
                  </Link>
                </>
              ) : null}
              <span className="mt-8 text-xs font-medium text-slate-500/70">
                © MergifyPDF
              </span>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
