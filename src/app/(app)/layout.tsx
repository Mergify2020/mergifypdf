import AppHeaderBrand from "@/components/AppHeaderBrand";
import Footer from "@/components/Footer";
import HeaderFeaturesLink from "@/components/HeaderFeaturesLink";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import HeaderPricingLink from "@/components/HeaderPricingLink";
import HeaderSupportLink from "@/components/HeaderSupportLink";
import HeroHeader from "@/components/HeroHeader";
import WorkspaceSettingsMenu from "@/components/WorkspaceSettingsMenu";
import WorkspaceShell from "@/components/WorkspaceShell";
import { getServerSessionSafe } from "@/lib/serverSession";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Shell selection must use an accurate auth result. A short timeout here can
  // intermittently return null and flash the public header/footer on protected pages.
  const session = await getServerSessionSafe(0);
  const cookieStore = await cookies();
  const sidebarExpandedCookie = cookieStore.get("mpdf_sidebar_expanded")?.value;
  const initialSidebarExpanded = sidebarExpandedCookie === "0" ? false : true;
  const lockedByTwoFactor =
    !!session?.user?.twoFactorEnabled && session.user.twoFactorPassed !== true;
  const authedWorkspace = session?.user && !lockedByTwoFactor;

  return authedWorkspace ? (
    <WorkspaceShell
      initialSidebarExpanded={initialSidebarExpanded}
      initialProfile={{
        id: session?.user?.id ?? null,
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null,
      }}
    >
      {children}
    </WorkspaceShell>
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
