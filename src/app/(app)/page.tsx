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
import RightSidebarColumn from "@/components/RightSidebarColumn";
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

  const session = await getServerSessionSafe();

  // When explicitly requested, always show the marketing hero,
  // even if the user already has an active session.
  if (landing === "hero") {
    const usedToday = await hasUsedToday();
    return <MarketingLanding usedToday={usedToday} />;
  }

  if (session?.user) {
    if (session.user.twoFactorEnabled && !session.user.twoFactorPassed) {
      redirect("/2fa");
    }
    const userId = session.user.id;
    if (!userId) {
      redirect("/login");
    }
    return (
      <ProjectsDashboard
        displayName={session.user.name ?? session.user.email ?? "Guest"}
        email={session.user.email ?? null}
        userId={userId}
      />
    );
  }

  const usedToday = await hasUsedToday();
  return <MarketingLanding usedToday={usedToday} />;
}

function MarketingLanding({ usedToday }: { usedToday: boolean }) {
  return (
    <>
      <FeaturesAutoScroll />
      <section className="relative -mt-[calc(76px+env(safe-area-inset-top))] w-full min-h-[46vh] overflow-hidden pt-[calc(76px+env(safe-area-inset-top))] lg:min-h-[50vh]">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/backgrounds/login-page-background-v5.svg"
            alt=""
            fill
            className="object-cover object-left sm:object-center"
            style={{ transform: "scaleX(-1)" }}
            priority={false}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-black/20" />
          <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-6 pb-8 sm:px-6 sm:pt-10 sm:pb-10 lg:px-8 lg:pt-12 lg:pb-12">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,620px)_minmax(0,760px)] lg:items-stretch">
              <div className="space-y-6 text-center lg:space-y-8 lg:col-start-1 lg:flex lg:h-full lg:flex-col lg:pt-3 lg:text-left lg:self-stretch">
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
                <RevealOnScroll as="div" className="hidden text-left lg:flex lg:flex-1 lg:flex-col lg:gap-8 lg:mt-auto">
                <div className="flex flex-col items-start gap-y-3 text-sm text-white/80 lg:mt-6">
                    {["Upload and start instantly", "Fast, reliable, and secure", "Runs right in your browser"].map((badge) => (
                    <div key={badge} className="flex items-center gap-3 text-[1rem] font-semibold lg:gap-5">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6D5EF3] text-[12px] text-white shadow-[0_8px_18px_rgba(109,94,243,0.35)]"
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
                <div className="flex justify-start text-white/90 lg:mt-auto lg:mb-2 lg:translate-y-2">
                  <HeroStats className="hero-stats" />
                </div>
                </RevealOnScroll>
              </div>

              <HeroUploadAndBullets />
            </div>
          </div>
      </section>

      <RevealOnScroll as="div" className="w-full bg-[#F4F6FF]">
        <LogoCarousel />
      </RevealOnScroll>

      <HeroFeatureArea />
    </>
  );
}

async function ProjectsDashboard({
  displayName,
  email,
  userId,
}: {
  displayName: string;
  email: string | null;
  userId: string;
}) {
  const firstName = displayName.split(" ")[0] ?? "there";
  const shapedProjects = await prisma.project.findMany({
    where: { userId, trashedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 60,
    select: {
      id: true,
      name: true,
      updatedAt: true,
      pagesCount: true,
      previewKey: true,
      pdfKey: true,
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
    <main className="h-screen w-full bg-[#F1F4F9] py-6 dark:bg-[#222224]">
      <div className="w-full">
        <div className="home-content-grid grid h-full w-full max-w-[1680px] min-h-0 gap-[24px] lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div
            id="home-projects-container"
            className="relative z-40 flex h-full min-h-0 w-full flex-col pl-1 pr-0 pb-10 pt-0 data-[shadow-overlay=true]:border-transparent data-[shadow-overlay=true]:shadow-none"
          >
            <div className="w-full">
              <HomeProjectsSearch
                firstName={firstName}
                accountName={displayName}
                accountEmail={email}
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
