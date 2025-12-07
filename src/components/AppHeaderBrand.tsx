"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppHeaderBrand() {
  const pathname = usePathname();
  const isSignatureExperience = pathname?.startsWith("/signature-center") ?? false;
  const isPricingPage = pathname === "/pricing";
  const isAccountSettings = pathname?.startsWith("/account") ?? false;
  const isProjectsPage = pathname?.startsWith("/projects") ?? false;

  const baseWidth = 160;
  const baseHeight = 40;
  const scale = isPricingPage || isAccountSettings || isProjectsPage ? 1.35 : 1;
  const logoWidth = Math.round(baseWidth * scale);
  const logoHeight = Math.round(baseHeight * scale);

  if (isSignatureExperience) {
    return (
      <Link href="/" className="inline-flex items-center gap-2" aria-label="Back to dashboard">
        <Image src="/Mergify-Sign.svg" alt="Mergify Sign" width={152} height={32} priority />
      </Link>
    );
  }

  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Back to dashboard">
      <Image src="/logo-wordmark2.svg" alt="MergifyPDF" width={logoWidth} height={logoHeight} priority />
    </Link>
  );
}
