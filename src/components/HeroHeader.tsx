"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface HeroHeaderProps {
  children: ReactNode;
}

export default function HeroHeader({ children }: HeroHeaderProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isPricingPage = pathname === "/pricing";
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";
  const isForgotPasswordPage = pathname === "/forgot-password";
  const isResetPasswordPage = pathname === "/reset-password";
  const isAnimatedPage = isHomePage || isPricingPage;

  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [fadeToGradient, setFadeToGradient] = useState(false);
  const lastScrolledState = useRef(false);
  const rafId = useRef<number | null>(null);
  const revertTimeoutId = useRef<number | null>(null);
  const fadeTimeoutId = useRef<number | null>(null);
  const revertDelayMs = 80;
  const scrollThreshold = 12;

  useEffect(() => {
    if (!isAnimatedPage) {
      lastScrolledState.current = false;
      if (revertTimeoutId.current !== null) {
        window.clearTimeout(revertTimeoutId.current);
        revertTimeoutId.current = null;
      }
      if (fadeTimeoutId.current !== null) {
        window.clearTimeout(fadeTimeoutId.current);
        fadeTimeoutId.current = null;
      }
      const resetId = window.setTimeout(() => {
        setScrolledPastHero(false);
        setFadeToGradient(false);
      }, 0);
      return () => {
        window.clearTimeout(resetId);
      };
    }

    const handleScroll = () => {
      if (rafId.current !== null) return;
      rafId.current = window.requestAnimationFrame(() => {
        rafId.current = null;
        const scrolled = window.scrollY > scrollThreshold;
        if (scrolled) {
          if (revertTimeoutId.current !== null) {
            window.clearTimeout(revertTimeoutId.current);
            revertTimeoutId.current = null;
          }
          if (fadeTimeoutId.current !== null) {
            window.clearTimeout(fadeTimeoutId.current);
            fadeTimeoutId.current = null;
          }
          setFadeToGradient(false);
          if (!lastScrolledState.current) {
            lastScrolledState.current = true;
            setScrolledPastHero(true);
          }
          return;
        }

        if (lastScrolledState.current && revertTimeoutId.current === null) {
          revertTimeoutId.current = window.setTimeout(() => {
            revertTimeoutId.current = null;
            if (window.scrollY <= scrollThreshold) {
              lastScrolledState.current = false;
              setFadeToGradient(true);
              setScrolledPastHero(false);
              if (fadeTimeoutId.current !== null) {
                window.clearTimeout(fadeTimeoutId.current);
              }
              fadeTimeoutId.current = window.setTimeout(() => {
                setFadeToGradient(false);
                fadeTimeoutId.current = null;
              }, 180);
            }
          }, revertDelayMs);
        }
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current !== null) {
        window.cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (revertTimeoutId.current !== null) {
        window.clearTimeout(revertTimeoutId.current);
        revertTimeoutId.current = null;
      }
      if (fadeTimeoutId.current !== null) {
        window.clearTimeout(fadeTimeoutId.current);
        fadeTimeoutId.current = null;
      }
    };
  }, [isAnimatedPage]);

  useEffect(() => {
    if (!isHomePage && !isPricingPage) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const color = isHomePage ? "#050816" : "#FFFFFF";
    meta.setAttribute("content", color);
  }, [isHomePage, isPricingPage, scrolledPastHero]);

  const gradientActive = isHomePage
    ? !scrolledPastHero
    : isAnimatedPage && !scrolledPastHero && !isPricingPage;
  let backgroundClass: string;
  if (gradientActive) {
    backgroundClass = isHomePage
      ? "bg-transparent"
      : isPricingPage
        ? "bg-transparent"
        : "bg-gradient-to-r from-[#FDF2FF] via-[#EEF2FF] to-[#E0F7FF]";
  } else {
    backgroundClass = isHomePage && scrolledPastHero ? "bg-transparent" : "bg-white";
  }

  const shadowClass = gradientActive || isHomePage ? "" : "shadow-sm";
  const borderColorClass = gradientActive || isHomePage ? "border-transparent" : "border-slate-200";
  const homeHeaderOverlay =
    isHomePage && gradientActive ? "backdrop-blur-0 shadow-none border-transparent" : "";
  const visibilityClass = "translate-y-0 opacity-100";

  if (isLoginPage || isRegisterPage || isForgotPasswordPage || isResetPasswordPage) {
    return null;
  }

  const transitionClass = fadeToGradient
    ? "transition-[background-color,box-shadow,border-color,backdrop-filter] duration-180 ease-out"
    : "";

  return (
    <header
      data-hero={gradientActive ? "true" : "false"}
      data-scrolled={isHomePage && scrolledPastHero ? "true" : "false"}
      className={`fixed top-0 left-0 right-0 z-50 w-full pt-[env(safe-area-inset-top)] ${isHomePage ? "" : gradientActive ? "" : "border-b"} ${backgroundClass} ${shadowClass} ${borderColorClass} ${visibilityClass} ${homeHeaderOverlay} ${transitionClass}`}
    >
      <div className="relative z-10">{children}</div>
    </header>
  );
}
