"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
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
        <div className="absolute inset-0 bg-transparent" />
        <div className="absolute left-0 right-0 bottom-0 top-[76px] bg-slate-900/25" />
        <div
          className={`fixed top-0 right-0 z-[61] h-screen w-[72vw] max-w-[520px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-5">
              <span className="sr-only">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="z-[62] flex h-10 w-10 items-center justify-center text-slate-800 transition hover:-translate-y-0.5"
                aria-label="Close menu"
              >
                <span className="relative h-6 w-6">
                  <span className="absolute left-0 top-1/2 h-[2px] w-6 -translate-y-1/2 rotate-45 rounded bg-slate-800" />
                  <span className="absolute left-0 top-1/2 h-[2px] w-6 -translate-y-1/2 -rotate-45 rounded bg-slate-800" />
                </span>
              </button>
            </div>
            <nav className="flex flex-col gap-5 px-6 py-8 text-lg font-semibold text-slate-900">
              <Link
                href="/pricing"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-2 py-3 transition hover:bg-slate-50"
              >
                Pricing
              </Link>
              <span className="rounded-xl px-2 py-3 text-slate-800">Features</span>
              <span className="rounded-xl px-2 py-3 text-slate-800">About</span>
              <span className="rounded-xl px-2 py-3 text-slate-800">Contact</span>
              {!isLoginPage ? (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-base font-semibold text-slate-900 shadow-sm"
                >
                  Log in
                </Link>
              ) : null}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
