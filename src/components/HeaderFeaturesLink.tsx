"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type HeaderFeaturesLinkProps = {
  className?: string;
  onNavigate?: () => void;
};

export default function HeaderFeaturesLink({ className, onNavigate }: HeaderFeaturesLinkProps) {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      event.preventDefault();
      const section = document.getElementById("features");
      if (section) {
        const header = document.querySelector("header");
        const headerHeight = header ? header.getBoundingClientRect().height : 0;
        const rect = section.getBoundingClientRect();
        const targetY = window.scrollY + rect.top - headerHeight - 12 + 24;
        window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
      }
    }
    onNavigate?.();
  };

  useEffect(() => {
    if (pathname !== "/") {
      setIsActive(false);
      return;
    }

    const section = document.getElementById("features");
    if (!section) {
      setIsActive(false);
      return;
    }

    const updateActive = () => {
      const header = document.querySelector("header");
      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      const rect = section.getBoundingClientRect();
      const viewportLine = window.innerHeight * 0.35;
      const top = rect.top - headerHeight;
      const bottom = rect.bottom - headerHeight;
      const inView = top <= viewportLine && bottom >= viewportLine;
      setIsActive(inView);
    };

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [pathname]);

  return (
    <Link
      href="/#features"
      onClick={handleClick}
      className={`${className ?? ""} ${isActive ? "underline underline-offset-8" : ""}`}
    >
      Features
    </Link>
  );
}
