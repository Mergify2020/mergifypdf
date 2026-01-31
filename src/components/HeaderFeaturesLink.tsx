"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type HeaderFeaturesLinkProps = {
  className?: string;
  onNavigate?: () => void;
};

export default function HeaderFeaturesLink({ className, onNavigate }: HeaderFeaturesLinkProps) {
  const pathname = usePathname();

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
    } else {
      try {
        window.sessionStorage.setItem("scrollToFeatures", "1");
      } catch {
        // no-op
      }
    }
    onNavigate?.();
  };

  return (
    <Link href="/#features" onClick={handleClick} className={className}>
      Features
    </Link>
  );
}
