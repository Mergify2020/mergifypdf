"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HeaderPricingLink() {
  const pathname = usePathname();
  const isPricingPage = pathname === "/pricing";

  return (
    <Link
      href="/pricing"
      className={`hero-nav-link transition hover:underline hover:underline-offset-8 ${
        isPricingPage ? "underline underline-offset-8" : ""
      }`}
    >
      Pricing
    </Link>
  );
}
