"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppHeaderBrand() {
  const pathname = usePathname();
  const isSignatureExperience = pathname?.startsWith("/signature-center") ?? false;

  if (isSignatureExperience) {
    return (
      <Link href="/" className="inline-flex items-center gap-2" aria-label="Back to dashboard">
        <Image src="/Mergify-Sign.svg" alt="Mergify Sign" width={150} height={32} priority />
      </Link>
    );
  }

  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Back to dashboard">
      <Image src="/logo-wordmark2.svg" alt="MergifyPDF" width={160} height={40} priority />
    </Link>
  );
}

