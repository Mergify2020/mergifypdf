"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  variant?: "default" | "sidebarNav" | "sidebarPanel";
  href?: string;
  logoLightSrc?: string;
  logoDarkSrc?: string;
};

export default function AppHeaderBrand({
  variant = "default",
  href = "/projects/all",
  logoLightSrc,
  logoDarkSrc,
}: Props) {
  const pathname = usePathname();
  const isAccountSettings = pathname?.startsWith("/account") ?? false;

  const handleBrandClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === href) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // The supplied wordmark is deliberately wide. Keep its native proportions
  // rather than fitting it into the old, taller logo frame.
  const isSidebarNav = variant === "sidebarNav";
  const baseWidth = isSidebarNav ? 187 : 154;
  const baseHeight = isSidebarNav ? 36 : 30;
  const autoScale = isAccountSettings ? 1.15 : 1;
  const scale = variant === "sidebarNav" || variant === "sidebarPanel" ? 1 : autoScale;
  const logoWidth = Math.round(baseWidth * scale);
  const logoHeight = Math.round(baseHeight * scale);
  const lightLogo = logoLightSrc ?? "/logos/logo-icontext-dark-v4.svg";
  const darkLogo = logoDarkSrc ?? "/logos/logo-icontext-v4-dark.svg";

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2"
      aria-label={href === "/" ? "Back to home" : "Back to dashboard"}
      onClick={handleBrandClick}
    >
      <Image
        src={lightLogo}
        alt="MergifyPDF"
        width={logoWidth}
        height={logoHeight}
        priority
        loading="eager"
        className="app-brand-light block dark:hidden"
        style={{ width: logoWidth, height: logoHeight }}
      />
      <Image
        src={darkLogo}
        alt="MergifyPDF"
        width={logoWidth}
        height={logoHeight}
        priority
        loading="eager"
        className="app-brand-dark hidden dark:block"
        style={{ width: logoWidth, height: logoHeight }}
      />
    </Link>
  );
}
