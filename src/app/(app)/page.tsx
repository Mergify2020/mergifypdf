import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import HeroFeatureArea from "@/components/HeroFeatureArea";
import LogoCarousel from "@/components/LogoCarousel";
import { hasUsedToday } from "@/lib/quota";
import RevealOnScroll from "@/components/RevealOnScroll";
import HeroUploadCard from "@/components/HeroUploadCard";
import FeaturesAutoScroll from "@/components/FeaturesAutoScroll";
import LandingImpactStats from "@/components/LandingImpactStats";
import LandingScrollbarTone from "@/components/LandingScrollbarTone";


type HomeSearchParams = Record<string, string | string[] | undefined>;

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<HomeSearchParams>;
}) {
  const resolved = ((await searchParams) ?? {}) as HomeSearchParams;
  const landingParam = resolved.landing;
  const landing =
    typeof landingParam === "string"
      ? landingParam
      : Array.isArray(landingParam)
        ? landingParam[0]
        : undefined;

  const session = await getServerSessionSafe();

  // Only honor marketing-hero forcing for signed-out visitors.
  if (landing === "hero" && !session?.user) {
    await hasUsedToday();
    return <MarketingLanding />;
  }

  if (session?.user) {
    const googleManagedAccount =
      !!session.user.providers?.includes("google") && !session.user.providers.includes("credentials");
    if (!googleManagedAccount && session.user.twoFactorEnabled && !session.user.twoFactorPassed) {
      redirect("/2fa");
    }
    if (!session.user.id) {
      redirect("/login");
    }
    redirect("/projects/all");
  }

  await hasUsedToday();
  return <MarketingLanding />;
}

function MarketingLanding() {
  return (
    <div className="bg-[#050510]">
      <LandingScrollbarTone />
      <FeaturesAutoScroll />
      <section className="relative -mt-[calc(76px+env(safe-area-inset-top))] w-full overflow-hidden pt-[calc(76px+env(safe-area-inset-top))]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-5%,rgba(139,124,255,0.35),transparent_36%),radial-gradient(circle_at_18%_18%,rgba(79,70,229,0.28),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(14,165,233,0.16),transparent_28%),linear-gradient(180deg,#050816_0%,#050816_48%,#090b16_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0)_34%,rgba(255,255,255,0)_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="relative mx-auto flex w-full max-w-[1400px] flex-col items-center px-4 pb-8 pt-5 text-center sm:px-6 sm:pb-10 sm:pt-8 lg:px-8 lg:pb-12 lg:pt-9">
          <div className="max-w-4xl">
            <RevealOnScroll as="div">
              <div className="relative mx-auto max-w-4xl">
                <h1 className="text-balance text-[clamp(2.25rem,5.2vw,4.1rem)] font-semibold tracking-[-0.05em] text-white sm:leading-[0.96]">
                  Work with PDFs from a single powerful workspace.
                </h1>
              </div>
            </RevealOnScroll>
            <RevealOnScroll as="div" delayMs={80}>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-8 text-white/[0.72] sm:text-lg">
                Everything you need to merge, edit, sign, compress, and organize documents.
              </p>
            </RevealOnScroll>
          </div>

          <RevealOnScroll as="div" delayMs={220} className="relative mt-10 w-full max-w-[1060px]">
            <div className="pointer-events-none absolute inset-x-10 top-6 h-28 rounded-full bg-[#8B7CFF]/20 blur-3xl" />
            <div className="relative rounded-[34px] border border-white/10 bg-white/[0.05] p-3 shadow-[0_36px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/5 backdrop-blur-xl sm:p-4">
              <div className="rounded-[26px] border border-white/10 bg-[#0a0d1c] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
                <HeroUploadCard />
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll as="div" className="relative mt-4 w-full -mb-2">
            <LogoCarousel />
          </RevealOnScroll>
        </div>
      </section>

      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#090b16_0%,#080819_46%,#0a0a1d_100%)] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,124,255,0.12),transparent_34%),radial-gradient(circle_at_18%_18%,rgba(79,70,229,0.07),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(14,165,233,0.05),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.055] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.24)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#8B7CFF]/8 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(ellipse_at_50%_100%,rgba(139,124,255,0.12),transparent_68%)]" />
        <LandingImpactStats />
        <HeroFeatureArea />
      </div>

    </div>
  );
}
