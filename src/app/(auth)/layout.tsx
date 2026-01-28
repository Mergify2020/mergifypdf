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
        <div className="mx-auto grid h-[76px] w-full max-w-[1320px] grid-cols-[auto_1fr_auto] items-center px-3 sm:px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <AppHeaderBrand
              logoLightSrc="/logos/home-expanded-sidebar-logo-light-v6.svg"
              logoDarkSrc="/logos/home-expanded-sidebar-logo-dark-v6.svg"
            />
          </div>
          <div className="hidden items-center justify-center gap-4 text-base font-semibold text-slate-700 min-[810px]:flex min-[810px]:gap-6">
            <Link
              href="/pricing"
              className="transition hover:text-slate-900 hover:underline hover:underline-offset-8"
            >
              Pricing
            </Link>
            <span className="cursor-default text-slate-700 hover:text-slate-900">Features</span>
            <span className="cursor-default text-slate-700 hover:text-slate-900">About</span>
            <span className="cursor-default text-slate-700 hover:text-slate-900">Contact</span>
          </div>
          <div className="hidden items-center justify-center gap-4 text-base font-semibold text-slate-700 min-[700px]:flex min-[810px]:hidden">
            <Link
              href="/pricing"
              className="transition hover:text-slate-900 hover:underline hover:underline-offset-8"
            >
              Pricing
            </Link>
            <span className="cursor-default text-slate-700 hover:text-slate-900">Features</span>
            <span className="cursor-default text-slate-700 hover:text-slate-900">About</span>
          </div>
          <div className="justify-self-end">
            <HeaderAuthButtons />
          </div>
        </div>
      </HeroHeader>
      <main className="page-fade-in flex min-h-0 flex-1 flex-col">{children}</main>
      <AuthFooter />
    </div>
  );
}
