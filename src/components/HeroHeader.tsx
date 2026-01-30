"use client";

import { type ReactNode, useEffect, useState } from "react";
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
  const isAnimatedPage = isHomePage || isPricingPage;

  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    if (!isAnimatedPage) {
      setScrolledPastHero(false);
      return;
    }

    const handleScroll = () => {
      setScrolledPastHero(window.scrollY > 0);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAnimatedPage]);

  const gradientActive = isHomePage ? !scrolledPastHero : isAnimatedPage && !scrolledPastHero;
  let backgroundClass: string;
  if (gradientActive) {
    backgroundClass = isPricingPage
      ? "bg-[#e3edf9]"
      : isHomePage
        ? "bg-gradient-to-r from-[rgba(218,236,255,0.95)] via-[rgba(224,230,255,0.7)] to-[rgba(206,210,255,0.85)]"
        : "bg-gradient-to-r from-[#FDF2FF] via-[#EEF2FF] to-[#E0F7FF]";
  } else {
    backgroundClass = "bg-white/95 backdrop-blur-md";
  }

  const shadowClass = gradientActive ? "" : "shadow-sm";
  const borderColorClass = gradientActive ? "border-transparent" : "border-slate-200";
  const homeHeaderOverlay =
    isHomePage && gradientActive ? "backdrop-blur-0 shadow-none border-transparent" : "";
  const visibilityClass = "translate-y-0 opacity-100";

  if (isLoginPage || isRegisterPage || isForgotPasswordPage) {
    return null;
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full ${gradientActive ? "" : "border-b"} ${backgroundClass} ${shadowClass} ${borderColorClass} ${visibilityClass} ${homeHeaderOverlay}`}
    >
      {children}
    </header>
  );
}
