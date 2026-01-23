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
  const isAnimatedPage = isHomePage || isPricingPage;

  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScroll = useRef(0);

  useEffect(() => {
    if (!isAnimatedPage) {
      setScrolledPastHero(true);
      setIsHidden(false);
      return;
    }

    const handleScroll = () => {
      setScrolledPastHero(window.scrollY > 24);
      const current = window.scrollY;
      const goingDown = current > lastScroll.current;
      const threshold = 120;

      if (goingDown && current > threshold) {
        setIsHidden(true);
      } else if (!goingDown || current <= threshold) {
        setIsHidden(false);
      }

      lastScroll.current = current;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAnimatedPage]);

  const gradientActive = isAnimatedPage && !scrolledPastHero;
  let backgroundClass: string;
  if (gradientActive) {
    backgroundClass = isPricingPage
      ? "bg-[#e3edf9]"
      : "bg-gradient-to-r from-[#FDF2FF] via-[#EEF2FF] to-[#E0F7FF]";
  } else {
    backgroundClass = "bg-white/95 backdrop-blur";
  }

  const shadowClass = gradientActive ? "" : "shadow-sm";
  const borderColorClass = gradientActive ? "border-transparent" : "border-slate-200";
  const visibilityClass = isAnimatedPage
    ? isHidden
      ? "-translate-y-full opacity-0 pointer-events-none"
      : "translate-y-0 opacity-100"
    : "translate-y-0";

  if (isLoginPage || isRegisterPage || isForgotPasswordPage) {
    return null;
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${backgroundClass} ${shadowClass} ${borderColorClass} ${visibilityClass}`}
    >
      {children}
    </header>
  );
}
