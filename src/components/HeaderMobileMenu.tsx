"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { CircleHelp, LogIn, Menu, Shapes, Tag, X } from "lucide-react";
import { siInstagram, siTiktok, siX } from "simple-icons";
import HeaderFeaturesLink from "@/components/HeaderFeaturesLink";
import HeaderUploadLink from "@/components/HeaderUploadLink";

export default function HeaderMobileMenu() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isPricingPage = pathname === "/pricing";
  const isSupportPage = pathname === "/support";
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const lockScrollYRef = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCloseMenu = useCallback(() => {
    triggerRef.current?.focus();
    setMenuOpen(false);
  }, []);

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
  }, [menuOpen, handleCloseMenu]);

  useEffect(() => {
    if (!menuOpen) return;

    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverflowX = body.style.overflowX;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevHtmlOverflowX = documentElement.style.overflowX;

    lockScrollYRef.current = window.scrollY;
    documentElement.style.overflow = "hidden";
    documentElement.style.overflowX = "hidden";
    body.style.overflow = "hidden";
    body.style.overflowX = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${lockScrollYRef.current}px`;
    body.style.width = "100%";

    return () => {
      documentElement.style.overflow = prevHtmlOverflow;
      documentElement.style.overflowX = prevHtmlOverflowX;
      body.style.overflow = prevBodyOverflow;
      body.style.overflowX = prevBodyOverflowX;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, lockScrollYRef.current);
    };
  }, [menuOpen]);

  const menuPanel =
    menuOpen && typeof document !== "undefined"
      ? createPortal(
          <div ref={menuRef} className="fixed inset-0 z-[60] lg:hidden" aria-hidden={!menuOpen}>
            <button
              type="button"
              onClick={handleCloseMenu}
              className="absolute inset-0 bg-transparent"
              aria-label="Close menu"
            />
            <div
              className="fixed inset-0 z-[61] h-[100dvh] w-screen max-w-none rounded-none bg-[#080B16] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.03),-18px_0_45px_rgba(0,0,0,0.35)]"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex h-[72px] items-center justify-between border-b border-white/8 bg-[#090C18] px-5 sm:h-[76px] sm:px-6">
                  <Link href="/" onClick={handleCloseMenu} className="inline-flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logos/home-expanded-sidebar-logo-dark-v6.svg"
                      alt="MergifyPDF"
                      className="h-[47px] w-auto"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={handleCloseMenu}
                    className="z-[62] flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/75 transition hover:-translate-y-0.5 hover:bg-white/[0.10] hover:text-white"
                    aria-label="Close menu"
                  >
                    <span className="sr-only">Close menu</span>
                    <X className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
                  </button>
                </div>
                <nav className="flex min-h-0 flex-1 flex-col px-5 pb-4 pt-3 sm:px-6 sm:py-8">
                  <div className="flex flex-col gap-0.5 text-base font-semibold text-white sm:gap-2 sm:text-lg">
                    <HeaderUploadLink
                      className="cursor-pointer rounded-xl px-2 py-2.5 text-white/82 transition hover:bg-white/[0.06] active:bg-white/10"
                      onNavigate={handleCloseMenu}
                    />
                    <HeaderFeaturesLink
                      className="cursor-pointer rounded-xl px-2 py-2.5 text-white/82 transition hover:bg-white/[0.06] active:bg-white/10"
                      onNavigate={handleCloseMenu}
                      trackActiveSection
                      activeStrategy="topBand"
                      leadingIcon={<Shapes className="h-4 w-4 text-white/48" aria-hidden="true" />}
                    />
                    <Link
                      href="/pricing"
                      onClick={handleCloseMenu}
                      aria-current={isPricingPage ? "page" : undefined}
                      className="group flex items-center rounded-xl px-2 py-2.5 transition hover:bg-white/[0.08] active:bg-white/12"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Tag className="h-4 w-4 text-white/48" aria-hidden="true" />
                        <span
                          className={`transition-transform duration-200 group-hover:translate-x-1 group-active:translate-x-0.5 ${
                            isPricingPage ? "underline underline-offset-8" : ""
                          }`}
                        >
                          Pricing
                        </span>
                      </span>
                    </Link>
                    <Link
                      href="/support"
                      onClick={handleCloseMenu}
                      aria-current={isSupportPage ? "page" : undefined}
                      className="group flex items-center rounded-xl px-2 py-2.5 transition hover:bg-white/[0.06] active:bg-white/10"
                    >
                      <span className="inline-flex items-center gap-2">
                        <CircleHelp className="h-4 w-4 text-white/48" aria-hidden="true" />
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
                        className="mt-1 inline-flex w-full items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.06] px-4 py-2.5 text-base font-semibold text-white shadow-[0_10px_22px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-white/[0.09] active:translate-y-0"
                      >
                        <LogIn className="mr-2 h-4 w-4 text-white/52" aria-hidden="true" />
                        <span>Login</span>
                      </Link>
                    ) : null}
                    {!isLoginPage ? (
                      <div className="mt-3">
                        <Link
                          href="/register"
                          onClick={handleCloseMenu}
                          className="inline-flex w-full items-center justify-center rounded-[10px] border border-[#8B7CFF]/25 bg-gradient-to-r from-[#8B7CFF] to-[#B06DFF] px-4 py-2.5 text-base font-semibold text-white shadow-[0_14px_28px_rgba(139,124,255,0.22)] transition hover:-translate-y-0.5 hover:from-[#9381FF] hover:to-[#C06DFF] active:translate-y-0"
                        >
                          Start 3-day trial
                        </Link>
                        <p className="mt-1 text-center text-[11px] font-medium text-white/48">
                          3-day trial • Cancel anytime
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-auto border-t border-white/10 pt-3 pb-[calc(env(safe-area-inset-bottom)+6px)] text-[11px] font-medium text-white/48">
                    <div className="flex items-center justify-center gap-5 text-white/58">
                      <a
                        href="https://www.tiktok.com/@mergify.pdf"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="MergifyPDF on TikTok"
                        className="inline-flex items-center gap-1.5 transition hover:text-white"
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
                        className="inline-flex items-center gap-1.5 transition hover:text-white"
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
                        className="inline-flex items-center gap-1.5 transition hover:text-white"
                      >
                        <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
                          <path fill="currentColor" d={siX.path} />
                        </svg>
                        <span>X</span>
                      </a>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-medium text-white/48">
                      <a href="#" className="transition hover:text-white">
                        Privacy Policy
                      </a>
                      <span aria-hidden="true">•</span>
                      <a href="#" className="transition hover:text-white">
                        Terms of Service
                      </a>
                    </div>
                  </div>
                </nav>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-white/15"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" /> : <Menu className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />}
      </button>
      {menuPanel}
    </div>
  );
}
