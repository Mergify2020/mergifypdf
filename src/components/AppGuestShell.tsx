"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AuthFooter from "@/app/(auth)/AuthFooter";
import Footer from "@/components/Footer";
import HeaderFeaturesLink from "@/components/HeaderFeaturesLink";
import HeaderPricingLink from "@/components/HeaderPricingLink";
import HeaderSupportLink from "@/components/HeaderSupportLink";
import HeroHeader from "@/components/HeroHeader";
import AppHeaderBrand from "@/components/AppHeaderBrand";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";

type AppGuestShellProps = {
  children: ReactNode;
};

export default function AppGuestShell({ children }: AppGuestShellProps) {
  const pathname = usePathname();
  const hideChrome = pathname === "/two-factor" || pathname === "/2fa";

  if (hideChrome) {
    return (
      <>
        {children}
        <AuthFooter />
      </>
    );
  }

  return (
    <>
      <HeroHeader>
        <div className="mx-auto grid h-[76px] w-full max-w-[1400px] grid-cols-[auto_1fr_auto] items-center px-3 sm:px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <AppHeaderBrand
              logoLightSrc="/logos/home-expanded-sidebar-logo-light-v6.svg"
              logoDarkSrc="/logos/home-expanded-sidebar-logo-dark-v6.svg"
            />
          </div>
          <div className="hero-nav hidden items-center justify-center gap-4 text-base font-semibold min-[810px]:flex min-[810px]:gap-6">
            <HeaderFeaturesLink className="hero-nav-link transition hover:underline hover:underline-offset-8" />
            <HeaderPricingLink />
            <span className="hero-nav-link cursor-default">About</span>
            <HeaderSupportLink className="hero-nav-link transition hover:underline hover:underline-offset-8" />
          </div>
          <div className="hero-nav hidden items-center justify-center gap-4 text-base font-semibold min-[700px]:flex min-[810px]:hidden">
            <HeaderFeaturesLink className="hero-nav-link transition hover:underline hover:underline-offset-8" />
            <HeaderPricingLink />
            <span className="hero-nav-link cursor-default">About</span>
          </div>
          <div className="justify-self-end">
            <HeaderAuthButtons />
          </div>
        </div>
      </HeroHeader>
      <main className="page-fade-in pt-[calc(76px+env(safe-area-inset-top))]">{children}</main>
      <Footer />
    </>
  );
}
