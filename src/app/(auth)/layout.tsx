import { redirect } from "next/navigation";
import AppHeaderBrand from "@/components/AppHeaderBrand";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import HeroHeader from "@/components/HeroHeader";
import { getServerSessionSafe } from "@/lib/serverSession";
import AuthFooter from "./AuthFooter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSessionSafe();
  const lockedByTwoFactor =
    !!session?.user?.twoFactorEnabled && session.user.twoFactorPassed !== true;

  if (session?.user && !lockedByTwoFactor) {
    redirect("/projects");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <HeroHeader>
        <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <AppHeaderBrand
              logoLightSrc="/logos/home-expanded-sidebar-logo-light-v6.svg"
              logoDarkSrc="/logos/home-expanded-sidebar-logo-dark-v6.svg"
            />
          </div>
          <HeaderAuthButtons />
        </div>
      </HeroHeader>
      <main className="page-fade-in flex min-h-0 flex-1 flex-col">{children}</main>
      <AuthFooter />
    </div>
  );
}
