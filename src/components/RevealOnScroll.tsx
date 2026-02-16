"use client";

import { type CSSProperties, type ElementType, type ReactNode, useEffect, useRef, useState } from "react";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  as?: ElementType;
  variant?: "default" | "fade";
  forceVisible?: boolean;
  onVisible?: () => void;
};

export default function RevealOnScroll({
  children,
  className,
  delayMs = 0,
  as: Component = "div",
  variant = "default",
  forceVisible = false,
  onVisible,
}: RevealOnScrollProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (forceVisible) return;
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const node = ref.current;
    if (!node) return;

    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (onVisible) onVisible();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: isMobile ? 0.12 : 0.06,
        rootMargin: isMobile ? "0px 0px -12% 0px" : "0px 0px -5% 0px",
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [forceVisible, onVisible]);

  const style: CSSProperties = {
    ["--reveal-delay" as keyof CSSProperties]: `${delayMs}ms`,
  };

  return (
    <Component
      ref={ref as never}
      className={`reveal-on-scroll ${variant === "fade" ? "reveal-fade" : ""} ${
        isVisible || forceVisible ? "is-visible" : ""
      } ${className ?? ""}`.trim()}
      style={style}
    >
      {children}
    </Component>
  );
}
