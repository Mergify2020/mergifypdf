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
      <section className="w-full bg-gradient-to-r from-[rgba(0,138,222,0.10)] via-[rgba(81,189,255,0.16)] to-[rgba(0,138,222,0.08)]">
        <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-14 lg:py-16">
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12">
            <div className="relative z-10 space-y-6 text-center lg:text-left">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-4xl xl:text-5xl">
                <span className="block md:whitespace-nowrap">
                  The fastest way to edit, sign,
                </span>
                <span className="block md:whitespace-nowrap">
                  and manage PDFs online.
                </span>
              </h1>
              <p className="text-base text-gray-700 sm:text-lg">
                Edit, manage, and sign your documents from anywhere with ease.
              </p>
              <div className="mt-4 flex w-full justify-center lg:justify-start">
                <UploadCta usedToday={usedToday} variant="hero" className="w-full max-w-md" />
              </div>
              <div className="mt-6 sm:mt-14 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600 lg:justify-start">
                {["1 free upload per day", "Fast performance", "Simple to use"].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex cursor-default items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-slate-700 shadow-sm dark:shadow-none"
                  >
                    <span className="h-2 w-2 rounded-full bg-[#024d7c]" />
                    {badge}
                  </span>
                ))}
              </div>
              <HeroStats />
              <p className="mt-3 text-xs font-semibold text-slate-500 sm:text-sm md:text-base">
                * Upgrade to get unlimited access to document editing and signing.
              </p>
            </div>

            <div className="relative z-10 mt-4 flex items-center justify-center sm:mt-8 lg:mt-0 lg:justify-end">
              <Image
                src="/visual-hero3.png"
                alt="Preview of the MergifyPDF workspace"
                width={880}
                height={640}
                className="w-full max-w-xl rounded-xl object-cover shadow-[0_40px_120px_rgba(9,20,45,0.25)] dark:shadow-none"
                priority
              />
              {/* Sparkles anchored to the screenshot card */}
              <Sparkle
                gradientId="sparkle-right-bottom"
                className="pointer-events-none absolute bottom-6 right-10 h-12 w-12 opacity-70 sm:bottom-7 sm:right-12 sm:h-14 sm:w-14 md:bottom-8 md:right-16 md:h-16 md:w-16"
              />
              <Sparkle
                gradientId="sparkle-right-bottom-small"
                className="pointer-events-none absolute bottom-3 right-4 h-6 w-6 opacity-80 sm:bottom-4 sm:right-6 sm:h-7 sm:w-7 md:bottom-5 md:right-10 md:h-8 md:w-8"
              />
            </div>
          </div>
        </div>
      </section>

      <HeroFeatureArea />
      <PersonaHighlight />
      <LogoCarousel />
    </>
  );
}

function isTrashedProject(data: unknown) {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  return record.trashed === true;
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
    where: { userId },
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
  const visibleProjects = shapedProjects.filter((project) => !isTrashedProject(project.data));
  const summaryProjects = visibleProjects.map((project) => ({
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
        <div className="grid h-full w-full max-w-[1680px] min-h-0 gap-[24px] lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div
            id="home-projects-container"
            className="relative z-40 flex h-full min-h-0 w-full flex-col px-1 pb-10 pt-0 data-[shadow-overlay=true]:border-transparent data-[shadow-overlay=true]:shadow-none"
          >
            <div className="w-full">
              <HomeProjectsSearch
                firstName={firstName}
                accountName={displayName}
                accountEmail={email}
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
