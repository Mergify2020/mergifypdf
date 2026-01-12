"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  variant?: "default" | "sidebarPanel";
};

export default function AppHeaderBrand({ variant = "default" }: Props) {
  const pathname = usePathname();
  const isSignatureExperience = pathname?.startsWith("/signature-center") ?? false;
  const isStudio = pathname?.startsWith("/studio") ?? false;
  const isPricingPage = pathname === "/pricing";
  const isAccountSettings = pathname?.startsWith("/account") ?? false;
  const isProjectsPage = pathname?.startsWith("/projects") ?? false;
  const useHardNav = process.env.NODE_ENV === "development" && isStudio;

  const baseWidth = 168;
  const baseHeight = 42;
  const autoScale = isPricingPage || isAccountSettings || isProjectsPage ? 1.35 : 1;
  const scale = variant === "sidebarPanel" ? 1.35 : autoScale;
  const logoWidth = Math.round(baseWidth * scale);
  const logoHeight = Math.round(baseHeight * scale);

  if (isSignatureExperience) {
    return (
      useHardNav ? (
        <a href="/" className="inline-flex items-center gap-2" aria-label="Back to dashboard">
          <Image
            src="/Mergify-Sign.svg"
            alt="Mergify Sign"
            width={Math.round(152 * scale)}
            height={Math.round(32 * scale)}
            priority
          />
        </a>
      ) : (
        <Link href="/" className="inline-flex items-center gap-2" aria-label="Back to dashboard">
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
    <a href="/" className="inline-flex items-center gap-2" aria-label="Back to dashboard">
      <Image
        src="/logo-wording.2026.2.svg"
        alt="MergifyPDF"
        width={logoWidth}
        height={logoHeight}
        priority
        className="block dark:hidden"
      />
      <Image
        src="/Merg.dark-logo.2026.svg"
        alt="MergifyPDF"
        width={logoWidth}
        height={logoHeight}
        priority
        className="hidden dark:block"
      />
    </a>
  ) : (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Back to dashboard">
      <Image
        src="/logo-wording.2026.2.svg"
        alt="MergifyPDF"
        width={logoWidth}
        height={logoHeight}
        priority
        className="block dark:hidden"
      />
      <Image
        src="/Merg.dark-logo.2026.svg"
        alt="MergifyPDF"
        width={logoWidth}
        height={logoHeight}
        priority
        className="hidden dark:block"
      />
    </Link>
  );
}
