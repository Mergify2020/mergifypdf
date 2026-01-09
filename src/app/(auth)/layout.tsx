import { redirect } from "next/navigation";
import AppHeaderBrand from "@/components/AppHeaderBrand";
import Footer from "@/components/Footer";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import HeroHeader from "@/components/HeroHeader";
import { getServerSessionSafe } from "@/lib/serverSession";

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
    <>
      <HeroHeader>
        <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <AppHeaderBrand />
          </div>
          <HeaderAuthButtons />
        </div>
      </HeroHeader>
      <main className="page-fade-in">{children}</main>
      <Footer />
    </>
  );
}
