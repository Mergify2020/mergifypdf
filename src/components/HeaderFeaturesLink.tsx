"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type HeaderFeaturesLinkProps = {
  className?: string;
  onNavigate?: () => void;
  trackActiveSection?: boolean;
  activeStrategy?: "crosshair" | "topBand";
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
};

export default function HeaderFeaturesLink({
  className,
  onNavigate,
  trackActiveSection = true,
  activeStrategy = "crosshair",
  leadingIcon,
  trailingIcon,
}: HeaderFeaturesLinkProps) {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const showActive = trackActiveSection && pathname === "/" && isActive;

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
    if (!trackActiveSection || pathname !== "/") {
      return;
    }

    let cleanup: (() => void) | null = null;
    let retryId: number | null = null;

    const attach = () => {
      const section = document.getElementById("features");
      if (!section) {
        retryId = window.setTimeout(attach, 120);
        return;
      }

      const updateActive = () => {
        const header = document.querySelector("header");
        const headerHeight = header ? header.getBoundingClientRect().height : 0;
        const rect = section.getBoundingClientRect();
        const top = rect.top - headerHeight;
        const bottom = rect.bottom - headerHeight;
        const inView =
          activeStrategy === "topBand"
            ? top <= window.innerHeight * 0.3 && top >= -280
            : top <= window.innerHeight * 0.35 && bottom >= window.innerHeight * 0.35;
        setIsActive(inView);
      };

      updateActive();
      window.addEventListener("scroll", updateActive, { passive: true });
      window.addEventListener("resize", updateActive);
      cleanup = () => {
        window.removeEventListener("scroll", updateActive);
        window.removeEventListener("resize", updateActive);
      };
    };

    attach();

    return () => {
      if (retryId !== null) {
        window.clearTimeout(retryId);
      }
      cleanup?.();
    };
  }, [pathname, trackActiveSection, activeStrategy]);

  return (
    <Link
      href="/#features"
      onClick={handleClick}
      className={`${className ?? ""} ${showActive ? "underline underline-offset-8" : ""}`}
    >
      {leadingIcon || trailingIcon ? (
        <span className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            {leadingIcon}
            <span>Features</span>
          </span>
          {trailingIcon ? <span aria-hidden="true">{trailingIcon}</span> : null}
        </span>
      ) : (
        "Features"
      )}
    </Link>
  );
}
