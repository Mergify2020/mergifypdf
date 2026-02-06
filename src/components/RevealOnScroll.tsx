"use client";

import { type CSSProperties, type ElementType, type ReactNode, useEffect, useRef, useState } from "react";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  as?: ElementType;
  variant?: "default" | "fade";
};

export default function RevealOnScroll({
  children,
  className,
  delayMs = 0,
  as: Component = "div",
  variant = "default",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: "0px 0px 20% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties = {
    ["--reveal-delay" as keyof CSSProperties]: `${delayMs}ms`,
  };

  return (
    <Component
      ref={ref as never}
      className={`reveal-on-scroll ${variant === "fade" ? "reveal-fade" : ""} ${
        isVisible ? "is-visible" : ""
      } ${className ?? ""}`.trim()}
      style={style}
    >
      {children}
    </Component>
  );
}
