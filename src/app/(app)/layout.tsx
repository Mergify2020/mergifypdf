import AppHeaderBrand from "@/components/AppHeaderBrand";
import Footer from "@/components/Footer";
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
        <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <AppHeaderBrand
              logoLightSrc="/logos/home-expanded-sidebar-logo-light-v4.svg"
              logoDarkSrc="/logos/home-expanded-sidebar-logo-dark-v4.svg"
            />
          </div>
          {!session?.user || lockedByTwoFactor ? (
            <HeaderAuthButtons />
          ) : (
            <WorkspaceSettingsMenu />
          )}
        </div>
      </HeroHeader>
      <main className="page-fade-in">{children}</main>
      <Footer />
    </>
  );
}
