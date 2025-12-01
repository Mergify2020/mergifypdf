"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppHeaderBrand() {
  const pathname = usePathname();
  const isSignatureExperience = pathname?.startsWith("/signature-center") ?? false;
  const isLoginPage = pathname === "/login";

  if (isSignatureExperience) {
    return (
      <Link href="/" className="inline-flex items-center gap-2" aria-label="Back to dashboard">
        <Image src="/Mergify-Sign.svg" alt="Mergify Sign" width={152} height={32} priority />
      </Link>
    );
  }

  if (isLoginPage) {
    // On the login page, always send users to the marketing hero,
    // even if they already have an active session.
    return (
      <Link
        href="/?landing=hero"
        className="inline-flex items-center gap-2"
        aria-label="Back to hero"
      >
        <Image src="/logo-wordmark2.svg" alt="MergifyPDF" width={160} height={40} priority />
      </Link>
    );
  }

  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Back to dashboard">
      <Image src="/logo-wordmark2.svg" alt="MergifyPDF" width={160} height={40} priority />
    </Link>
  );
}
