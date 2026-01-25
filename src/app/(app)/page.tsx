import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import UploadCta from "@/components/UploadCta";
import HeroStats from "@/components/HeroStats";
import HeroFeatureArea from "@/components/HeroFeatureArea";
import PersonaHighlight from "@/components/PersonaHighlight";
import LogoCarousel from "@/components/LogoCarousel";
import { hasUsedToday } from "@/lib/quota";
import { prisma } from "@/lib/prisma";
import ContainerShadowOverlay from "@/components/ContainerShadowOverlay";
import RightSidebarColumn from "@/components/RightSidebarColumn";
import HomeProjectsSearch from "@/components/HomeProjectsSearch";

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
      <section className="relative w-full bg-gradient-to-r from-[rgba(218,236,255,0.95)] via-[rgba(224,230,255,0.7)] to-[rgba(206,210,255,0.85)]">
        <div className="relative mx-auto w-full max-w-7xl px-6 pt-10 pb-0 sm:pt-14 sm:pb-0 lg:pt-16 lg:pb-0">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-20 xl:gap-24">
            <div className="relative z-10 space-y-6 text-center lg:pb-12 lg:text-left">
              <h1 className="text-3xl font-semibold leading-[1.08] tracking-tight sm:text-4xl lg:text-[2.75rem] xl:text-[3.25rem]">
                <span className="block">All-in-one online document</span>
                <span className="block">editor tool.</span>
              </h1>
              <p className="max-w-2xl text-base font-normal text-gray-700 sm:text-lg lg:whitespace-nowrap">
                No installs. No clutter. Just edit, sign, and go. Your work stays saved.
              </p>
              <div className="mt-14 flex w-full justify-center lg:justify-start">
                <UploadCta usedToday={usedToday} variant="hero" className="w-full max-w-md" />
              </div>
              <div className="mt-10 flex flex-col items-center gap-7 text-sm text-slate-600 lg:items-start">
                {["1 free upload per day", "Fast performance", "Simple to use"].map((badge) => (
                  <div key={badge} className="flex items-center gap-4 text-base font-semibold text-slate-700">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6D5EF3] text-[12px] text-white shadow-[0_6px_16px_rgba(109,94,243,0.25)]"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <span>{badge}</span>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <HeroStats />
              </div>
            </div>

            <div className="relative z-10 mt-6 flex items-center justify-center sm:mt-10 lg:absolute lg:bottom-0 lg:right-0 lg:mt-0 lg:w-[58%] lg:items-end lg:justify-end">
              <div className="relative w-full max-w-lg lg:max-w-none lg:h-[456px] lg:w-[620px] lg:flex-none lg:origin-bottom-right lg:scale-100">
                <Image
                  src="/backgrounds/hero-page-laptop-v6.png"
                  alt="Preview of the MergifyPDF workspace"
                  width={880}
                  height={640}
                  className="w-full object-contain lg:h-full lg:w-full lg:object-bottom drop-shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
        <div className="w-full border-t border-slate-200/40 bg-[#F4F6FF]">
          <LogoCarousel />
        </div>
      </section>

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
