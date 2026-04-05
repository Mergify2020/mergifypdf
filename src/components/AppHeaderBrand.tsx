"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  variant?: "default" | "sidebarPanel";
  logoLightSrc?: string;
  logoDarkSrc?: string;
};

export default function AppHeaderBrand({
  variant = "default",
  logoLightSrc,
  logoDarkSrc,
}: Props) {
  const pathname = usePathname();
  const isSignatureExperience = pathname?.startsWith("/signature-center") ?? false;
  const isStudio = pathname?.startsWith("/studio") ?? false;
  const isPricingPage = pathname === "/pricing";
  const isAccountSettings = pathname?.startsWith("/account") ?? false;
  const isProjectsPage = pathname?.startsWith("/projects") ?? false;
  const useHardNav = process.env.NODE_ENV === "development" && isStudio;

  const handleBrandClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/projects/all") {
      event.preventDefault();
      window.history.replaceState(null, "", "/projects/all");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const baseWidth = 168;
  const baseHeight = 42;
  const autoScale = isAccountSettings ? 1.35 : 1.12;
  const scale = variant === "sidebarPanel" ? 1.26 : autoScale;
  const logoWidth = Math.round(baseWidth * scale);
  const logoHeight = Math.round(baseHeight * scale);
  const lightLogo = logoLightSrc ?? "/logo-wording.2026.2.svg";
  const darkLogo = logoDarkSrc ?? "/Merg.dark-logo.2026.svg";

  if (isSignatureExperience) {
    return (
      useHardNav ? (
        <a href="/projects/all" className="inline-flex items-center gap-2" aria-label="Back to dashboard">
          <Image
            src="/Mergify-Sign.svg"
            alt="Mergify Sign"
            width={Math.round(152 * scale)}
            height={Math.round(32 * scale)}
            priority
          />
        </a>
      ) : (
        <Link href="/projects/all" className="inline-flex items-center gap-2" aria-label="Back to dashboard">
          <Image
            src="/Mergify-Sign.svg"
            alt="Mergify Sign"
            width={Math.round(152 * scale)}
            height={Math.round(32 * scale)}
            priority
          />
        </Link>
      )
    );
  }

  return useHardNav ? (
    <a
      href="/projects/all"
      className="inline-flex items-center gap-2"
      aria-label="Back to dashboard"
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
    </a>
  ) : (
    <Link
      href="/projects/all"
      className="inline-flex items-center gap-2"
      aria-label="Back to dashboard"
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
