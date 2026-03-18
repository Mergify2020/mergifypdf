import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import HeroStats from "@/components/HeroStats";
import HeroFeatureArea from "@/components/HeroFeatureArea";
import PersonaHighlight from "@/components/PersonaHighlight";
import LogoCarousel from "@/components/LogoCarousel";
import { hasUsedToday } from "@/lib/quota";
import { prisma } from "@/lib/prisma";
import ContainerShadowOverlay from "@/components/ContainerShadowOverlay";
import RightSidebarColumn, { HomeQuickActionsCard } from "@/components/RightSidebarColumn";
import HomeProjectsSearch from "@/components/HomeProjectsSearch";
import RevealOnScroll from "@/components/RevealOnScroll";
import HeroUploadAndBullets from "@/components/HeroUploadAndBullets";
import FeaturesAutoScroll from "@/components/FeaturesAutoScroll";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Sparkle({ className, gradientId }: { className?: string; gradientId: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F044FF" />
          <stop offset="100%" stopColor="#399BFF" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M12 3.5 13.8 9l5.7 1.7L13.8 12 12 18.5 10.2 12 4.5 10.7 10.2 9z"
      />
    </svg>
  );
}

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

  // Keep auth resolution behavior in sync with the app layout to avoid mixed
  // renders (workspace shell + marketing hero) during first load.
  const session = await getServerSessionSafe(0);

  // Only honor marketing-hero forcing for signed-out visitors.
  if (landing === "hero" && !session?.user) {
    const usedToday = await hasUsedToday();
    return <MarketingLanding usedToday={usedToday} />;
  }

  if (session?.user) {
    if (session.user.twoFactorEnabled && !session.user.twoFactorPassed) {
      redirect("/2fa");
    }
    if (!session.user.id) {
      redirect("/login");
    }
    redirect("/projects/all");
  }

  const usedToday = await hasUsedToday();
  return <MarketingLanding usedToday={usedToday} />;
}

function MarketingLanding({ usedToday }: { usedToday: boolean }) {
  return (
    <div className="bg-[#F6F8FF]">
      <FeaturesAutoScroll />
      <section className="relative -mt-[calc(76px+env(safe-area-inset-top))] w-full min-h-[46vh] overflow-hidden pt-[calc(76px+env(safe-area-inset-top))] lg:min-h-[50vh]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#2F109C] via-[#6156E6] to-[#7A9CFF]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(255,255,255,0.2),transparent_45%),radial-gradient(circle_at_85%_25%,rgba(255,255,255,0.16),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_40%,rgba(255,255,255,0)_100%)]" />
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[260px] w-[520px] bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.45),rgba(255,255,255,0)_70%)]" />
        <div className="pointer-events-none absolute right-[-10%] top-[-10%] h-[260px] w-[520px] bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.45),rgba(255,255,255,0)_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.22),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:22px_22px]" />
          <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-6 pb-8 sm:px-6 sm:pt-10 sm:pb-10 lg:px-8 lg:pt-12 lg:pb-12">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,620px)_minmax(0,760px)] lg:items-stretch">
            <div className="space-y-5 text-center lg:space-y-7 lg:col-start-1 lg:flex lg:h-full lg:flex-col lg:pt-3 lg:text-left lg:self-stretch">
                <RevealOnScroll as="div">
                <h1 className="text-[clamp(2rem,3.2vw,2.8rem)] font-bold leading-[1.08] tracking-tight text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.6)] lg:text-balance">
                  Merge, edit, and sign documents in minutes.
                  </h1>
                </RevealOnScroll>
                <RevealOnScroll as="div">
                <p className="text-[1.125rem] font-bold leading-relaxed text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.6)]">
                    No installs. No clutter. Upload and finish fast.{" "}
                  <span className="whitespace-nowrap lg:block lg:whitespace-normal">
                    Your work stays saved.
                  </span>
                  </p>
                </RevealOnScroll>
              <RevealOnScroll as="div" className="hidden text-left lg:flex lg:flex-1 lg:flex-col lg:gap-4 lg:mt-auto lg:-mt-[3px]">
                <div className="flex flex-col items-start gap-y-3 text-sm text-white/80 lg:mt-[15px]">
                    {["Upload and start instantly", "Fast, reliable, and secure", "Runs right in your browser"].map((badge) => (
                    <div key={badge} className="flex items-center gap-3 text-[1rem] font-semibold lg:gap-5">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[12px] text-white shadow-[0_8px_18px_rgba(15,23,42,0.22),0_1px_3px_rgba(15,23,42,0.28)]"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <span className="font-bold text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.6)]">
                        {badge}
                      </span>
                    </div>
                  ))}
                  </div>
                <div className="flex justify-start text-white/90 lg:mt-auto lg:mb-0 lg:translate-y-2">
                  <HeroStats className="hero-stats" />
                </div>
                </RevealOnScroll>
              </div>

              <HeroUploadAndBullets />
            </div>
          </div>
      </section>

      <RevealOnScroll as="div" className="w-full border-y border-slate-200 bg-[#fff]">
        <LogoCarousel />
      </RevealOnScroll>

      <HeroFeatureArea />
    </div>
  );
}

async function ProjectsDashboard({
  displayName,
  userId,
}: {
  displayName: string;
  userId: string;
}) {
  const shapedProjects = await prisma.project.findMany({
    where: { userId, trashedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: {
      id: true,
      name: true,
      updatedAt: true,
      pagesCount: true,
      previewKey: true,
      data: true,
    },
  });
  const summaryProjects = shapedProjects.map((project) => ({
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    pagesCount: project.pagesCount ?? 0,
    previewUrl: null,
    pdfUrl: null,
    hasPreview: !!project.previewKey,
    rotation: (() => {
      if (!project.data || typeof project.data !== "object") return 0;
      const record = project.data as Record<string, unknown>;
      const pages = Array.isArray(record.pages) ? record.pages : null;
      if (!pages || pages.length === 0) return 0;
      const first = pages[0];
      if (!first || typeof first !== "object") return 0;
      return typeof (first as { rotation?: unknown }).rotation === "number"
        ? (first as { rotation: number }).rotation
        : 0;
    })(),
  }));
  return (
    <main
      className="box-border w-full bg-[#F1F4F9] pt-3 pb-0 sm:pt-6 sm:pb-0 transition-[height] duration-300 ease-out dark:bg-[#222224]"
      style={{
        height:
          "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px) - var(--home-topbar-offset, 0px) - var(--workspace-content-bottom-subtract, var(--workspace-frame-gutter, 48px)))",
      }}
    >
      <div className="h-full min-h-0 w-full">
        <div className="home-content-grid grid h-full w-full min-h-0 gap-[24px] xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
          <div
            id="home-projects-container"
            className="relative z-40 flex h-full min-h-0 w-full flex-col px-0 pt-0 data-[shadow-overlay=true]:border-transparent data-[shadow-overlay=true]:shadow-none md:pl-1 md:pr-0"
          >
            <div className="home-with-quick-actions flex h-full min-h-0 w-full flex-col">
              <div className="mb-4 hidden md:block xl:hidden">
                <HomeQuickActionsCard />
              </div>
              <HomeProjectsSearch
                accountName={displayName}
                ownerKey={userId}
                projects={summaryProjects}
                showOwnerFilter={false}
                showResumeBadge
              />
            </div>
          </div>
          <RightSidebarColumn />
        </div>
      </div>
      <ContainerShadowOverlay targetId="home-projects-container" overlayZIndex={45} />
    </main>
  );
}
