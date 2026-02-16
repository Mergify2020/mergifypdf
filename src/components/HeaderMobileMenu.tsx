"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleHelp, Info, LogIn, Shapes, Tag } from "lucide-react";
import { siInstagram, siTiktok, siX } from "simple-icons";
import HeaderFeaturesLink from "@/components/HeaderFeaturesLink";

export default function HeaderMobileMenu() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isPricingPage = pathname === "/pricing";
  const isSupportPage = pathname === "/support";
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const lockScrollYRef = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleCloseMenu() {
    triggerRef.current?.focus();
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;

    function handleClick(event: MouseEvent | TouchEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        handleCloseMenu();
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
    const { body, documentElement } = document;
    const header = document.querySelector("header") as HTMLElement | null;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverflowX = body.style.overflowX;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevHtmlOverflowX = documentElement.style.overflowX;
    const prevHeaderBackground = header?.style.backgroundColor ?? "";
    const prevHeaderBorderBottom = header?.style.borderBottom ?? "";
    const prevHeaderBoxShadow = header?.style.boxShadow ?? "";

    lockScrollYRef.current = window.scrollY;
    documentElement.style.overflow = "hidden";
    documentElement.style.overflowX = "hidden";
    body.style.overflow = "hidden";
    body.style.overflowX = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${lockScrollYRef.current}px`;
    body.style.width = "100%";
    if (header) {
      const isHeroState = header.dataset.hero === "true";
      if (isHeroState) {
        header.style.backgroundColor = "transparent";
        header.style.borderBottom = "1px solid transparent";
        header.style.boxShadow = "none";
      } else {
        header.style.backgroundColor = "#ffffff";
        header.style.borderBottom = "1px solid rgba(226,232,240,1)";
        header.style.boxShadow = "0 1px 0 rgba(15,23,42,0.03)";
      }
    }

    return () => {
      documentElement.style.overflow = prevHtmlOverflow;
      documentElement.style.overflowX = prevHtmlOverflowX;
      body.style.overflow = prevBodyOverflow;
      body.style.overflowX = prevBodyOverflowX;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      if (header) {
        header.style.backgroundColor = prevHeaderBackground;
        header.style.borderBottom = prevHeaderBorderBottom;
        header.style.boxShadow = prevHeaderBoxShadow;
      }
      window.scrollTo(0, lockScrollYRef.current);
    };
  }, [menuOpen]);


  return (
    <div ref={menuRef} className="relative lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex h-10 w-10 items-center justify-center text-slate-800 transition hover:-translate-y-0.5"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? (
          <span className="relative h-[26px] w-[26px]">
            <span className="absolute left-0 top-1/2 h-[2px] w-[26px] -translate-y-1/2 rotate-45 rounded bg-slate-800" />
            <span className="absolute left-0 top-1/2 h-[2px] w-[26px] -translate-y-1/2 -rotate-45 rounded bg-slate-800" />
          </span>
        ) : (
          <span className="flex flex-col gap-[4px]">
            <span className="h-[2px] w-[26px] rounded bg-slate-800" />
            <span className="h-[2px] w-[26px] rounded bg-slate-800" />
            <span className="h-[2px] w-[26px] rounded bg-slate-800" />
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
          onClick={handleCloseMenu}
          className="absolute inset-0 bg-transparent"
          aria-label="Close menu"
        />
        <div
          className={`fixed top-0 right-0 z-[61] h-[100dvh] w-screen max-w-none rounded-none bg-white shadow-none transition-transform duration-300 sm:w-[75vw] sm:max-w-[520px] sm:rounded-l-[18px] sm:shadow-[0_0_0_1px_rgba(15,23,42,0.04),-18px_0_45px_rgba(15,23,42,0.12)] ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white px-5 sm:h-[76px] sm:px-6">
              <Link href="/" onClick={handleCloseMenu} className="inline-flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/home-expanded-sidebar-logo-light-v6.svg"
                  alt="MergifyPDF"
                  className="h-[47px] w-auto"
                />
              </Link>
              <button
                type="button"
                onClick={handleCloseMenu}
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
            <nav className="flex min-h-0 flex-1 flex-col px-5 pb-4 pt-3 sm:px-6 sm:py-8">
              <div className="flex flex-col gap-0.5 text-base font-semibold text-slate-900 sm:gap-2 sm:text-lg">
                <HeaderFeaturesLink
                  className="cursor-pointer rounded-xl px-2 py-2.5 text-slate-800 transition hover:bg-slate-50 active:bg-slate-100"
                  onNavigate={handleCloseMenu}
                  trackActiveSection
                  activeStrategy="topBand"
                  leadingIcon={<Shapes className="h-4 w-4 text-slate-500" aria-hidden="true" />}
                />
                <Link
                  href="/pricing"
                  onClick={handleCloseMenu}
                  aria-current={isPricingPage ? "page" : undefined}
                  className="group flex items-center rounded-xl px-2 py-2.5 transition hover:bg-slate-50 active:bg-slate-100"
                >
                  <span className="inline-flex items-center gap-2">
                    <Tag className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span
                      className={`transition-transform duration-200 group-hover:translate-x-1 group-active:translate-x-0.5 ${
                        isPricingPage ? "underline underline-offset-8" : ""
                      }`}
                    >
                      Pricing
                    </span>
                  </span>
                </Link>
                <span className="inline-flex items-center gap-2 rounded-xl px-2 py-2.5 text-slate-800 transition hover:bg-slate-50 active:bg-slate-100">
                  <Info className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <span>About</span>
                </span>
                <Link
                  href="/support"
                  onClick={handleCloseMenu}
                  aria-current={isSupportPage ? "page" : undefined}
                  className="group flex items-center rounded-xl px-2 py-2.5 transition hover:bg-slate-50 active:bg-slate-100"
                >
                  <span className="inline-flex items-center gap-2">
                    <CircleHelp className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span
                      className={`transition-transform duration-200 group-hover:translate-x-1 group-active:translate-x-0.5 ${
                        isSupportPage ? "underline underline-offset-8" : ""
                      }`}
                    >
                      Support
                    </span>
                  </span>
                </Link>
                {!isLoginPage ? (
                  <Link
                    href="/login"
                    onClick={handleCloseMenu}
                    className="inline-flex items-center gap-2 rounded-xl px-2 py-2.5 text-slate-800 transition hover:bg-slate-50 active:bg-slate-100"
                  >
                    <LogIn className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span>Login</span>
                  </Link>
                ) : null}
                {!isLoginPage ? (
                  <div className="mt-3">
                    <Link
                      href="/register"
                      onClick={handleCloseMenu}
                      className="inline-flex w-full items-center justify-center rounded-[10px] bg-[#6D5EF3] px-4 py-2.5 text-base font-semibold text-white shadow-[0_12px_24px_rgba(109,94,243,0.25)] transition hover:bg-[#7567F5] active:bg-[#6354E6]"
                    >
                      Start Free Trial
                    </Link>
                    <p className="mt-1 text-center text-[11px] font-medium text-slate-500">
                      3-day trial • Cancel anytime
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="mt-auto border-t border-slate-200/80 pt-3 pb-[calc(env(safe-area-inset-bottom)+6px)] text-[11px] font-medium text-slate-500">
                <div className="flex items-center justify-center gap-5 text-slate-600">
                  <a
                    href="https://www.tiktok.com/@mergify.pdf"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="MergifyPDF on TikTok"
                    className="inline-flex items-center gap-1.5 transition hover:text-slate-800"
                  >
                    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
                      <path fill="currentColor" d={siTiktok.path} />
                    </svg>
                    <span>TikTok</span>
                  </a>
                  <a
                    href="https://www.instagram.com/mergifypdf/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="MergifyPDF on Instagram"
                    className="inline-flex items-center gap-1.5 transition hover:text-slate-800"
                  >
                    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
                      <path fill="currentColor" d={siInstagram.path} />
                    </svg>
                    <span>Instagram</span>
                  </a>
                  <a
                    href="https://x.com/MergifyPDF"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="MergifyPDF on X"
                    className="inline-flex items-center gap-1.5 transition hover:text-slate-800"
                  >
                    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
                      <path fill="currentColor" d={siX.path} />
                    </svg>
                    <span>X</span>
                  </a>
                </div>
                <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-medium text-slate-500">
                  <a href="#" className="transition hover:text-slate-800">
                    Privacy Policy
                  </a>
                  <span aria-hidden="true">•</span>
                  <a href="#" className="transition hover:text-slate-800">
                    Terms of Service
                  </a>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
