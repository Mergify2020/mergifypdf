import Link from "next/link";
import AppHeaderBrand from "@/components/AppHeaderBrand";
import Footer from "@/components/Footer";
import HeaderFeaturesLink from "@/components/HeaderFeaturesLink";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import HeroHeader from "@/components/HeroHeader";
import WorkspaceSettingsMenu from "@/components/WorkspaceSettingsMenu";
import WorkspaceShell from "@/components/WorkspaceShell";
import { getServerSessionSafe } from "@/lib/serverSession";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSessionSafe();
  const lockedByTwoFactor =
    !!session?.user?.twoFactorEnabled && session.user.twoFactorPassed !== true;
  const authedWorkspace = session?.user && !lockedByTwoFactor;

  return authedWorkspace ? (
    <WorkspaceShell>{children}</WorkspaceShell>
  ) : (
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
            <Link
              href="/pricing"
              className="hero-nav-link transition hover:underline hover:underline-offset-8"
            >
              Pricing
            </Link>
            <HeaderFeaturesLink className="hero-nav-link transition hover:underline hover:underline-offset-8" />
            <span className="hero-nav-link cursor-default">About</span>
            <span className="hero-nav-link cursor-default">Contact</span>
          </div>
          <div className="hero-nav hidden items-center justify-center gap-4 text-base font-semibold min-[700px]:flex min-[810px]:hidden">
            <Link
              href="/pricing"
              className="hero-nav-link transition hover:underline hover:underline-offset-8"
            >
              Pricing
            </Link>
            <HeaderFeaturesLink className="hero-nav-link transition hover:underline hover:underline-offset-8" />
            <span className="hero-nav-link cursor-default">About</span>
          </div>
          <div className="justify-self-end">
            {!session?.user || lockedByTwoFactor ? (
              <HeaderAuthButtons />
            ) : (
              <WorkspaceSettingsMenu />
            )}
          </div>
        </div>
      </HeroHeader>
      <main className="page-fade-in pt-[calc(76px+env(safe-area-inset-top))]">{children}</main>
      <Footer />
    </>
  );
}
