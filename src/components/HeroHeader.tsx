"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface HeroHeaderProps {
  children: ReactNode;
}

export default function HeroHeader({ children }: HeroHeaderProps) {
  const pathname = usePathname();
  const isHeroPage = pathname === "/";
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScroll = useRef(0);

  useEffect(() => {
    if (!isHeroPage) {
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
  }, [isHeroPage]);

  const gradientActive = isHeroPage && !scrolledPastHero;
  const backgroundClass = gradientActive
    ? "bg-gradient-to-r from-[#FDF2FF] via-[#EEF2FF] to-[#E0F7FF]"
    : "bg-white/95 backdrop-blur";
  const shadowClass = gradientActive ? "" : "shadow-sm";
  const borderColorClass = gradientActive ? "border-transparent" : "border-slate-200";
  const visibilityClass = isHeroPage
    ? isHidden
      ? "-translate-y-full opacity-0 pointer-events-none"
      : "translate-y-0 opacity-100"
    : "translate-y-0";

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${backgroundClass} ${shadowClass} ${borderColorClass} ${visibilityClass}`}
    >
      {children}
    </header>
  );
}
