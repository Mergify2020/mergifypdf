import { redirect } from "next/navigation";
import Link from "next/link";
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
        <div className="relative mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <AppHeaderBrand
              logoLightSrc="/logos/home-expanded-sidebar-logo-light-v6.svg"
              logoDarkSrc="/logos/home-expanded-sidebar-logo-dark-v6.svg"
            />
          </div>
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 text-base font-semibold text-slate-700 md:flex">
            <span className="cursor-default text-slate-700 hover:text-slate-900">About</span>
            <Link
              href="/pricing"
              className="transition hover:text-slate-900 hover:underline hover:underline-offset-8"
            >
              Pricing
            </Link>
            <span className="cursor-default text-slate-700 hover:text-slate-900">Features</span>
            <span className="cursor-default text-slate-700 hover:text-slate-900">Contact</span>
          </div>
          <HeaderAuthButtons />
        </div>
      </HeroHeader>
      <main className="page-fade-in flex min-h-0 flex-1 flex-col">{children}</main>
      <AuthFooter />
    </div>
  );
}
