"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type HeaderUploadLinkProps = {
  className?: string;
  onNavigate?: () => void;
  trackActiveSection?: boolean;
  activeStrategy?: "crosshair" | "topBand";
};

export default function HeaderUploadLink({
  className,
  onNavigate,
  trackActiveSection = true,
  activeStrategy = "crosshair",
}: HeaderUploadLinkProps) {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const showActive = trackActiveSection && pathname === "/" && isActive;

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    onNavigate?.();
  };

  useEffect(() => {
    if (!trackActiveSection || pathname !== "/") {
      return;
    }

    let cleanup: (() => void) | null = null;

    const attach = () => {
      const updateActive = () => {
        setIsActive(window.scrollY <= 16);
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
      cleanup?.();
    };
  }, [pathname, trackActiveSection, activeStrategy]);

  return (
    <Link
      href="/"
      onClick={handleClick}
      className={`${className ?? ""} ${showActive ? "underline underline-offset-8" : ""}`.trim()}
    >
      Upload
    </Link>
  );
}
