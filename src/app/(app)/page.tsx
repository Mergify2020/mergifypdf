import Image from "next/image";
import Link from "next/link";
import { FileText, PenLine, Send } from "lucide-react";
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
import AIAssistantPanel from "@/components/AIAssistantPanel";
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
                    className="inline-flex cursor-default items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-slate-700 shadow-sm"
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
                className="w-full max-w-xl rounded-xl object-cover shadow-[0_40px_120px_rgba(9,20,45,0.25)]"
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
    <main className="h-screen w-full bg-[#F1F4F9] py-6">
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
              />
            </div>
          </div>
          <aside
            id="home-sidebar"
            className="relative z-10 flex w-full flex-col min-h-0"
            style={{
              marginTop: "var(--home-right-column-offset, 240px)",
              height: "calc(100vh - var(--home-right-column-offset, 240px) - 48px)",
              gap: "var(--home-section-gap, 24px)",
            }}
          >
            <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.10)]">
              <Link
                href="/signature-center"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] hover:text-[#4B5563]"
              >
                SIGN DOCUMENTS
              </Link>
              <div className="mt-3 flex flex-col text-sm font-medium text-slate-700">
                <Link
                  href="/signature-center"
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50 cursor-pointer"
                >
                  <Send className="h-4 w-4 text-[#4F46E5] transition-transform duration-[120ms] group-hover:translate-x-0.5" aria-hidden />
                  <span className="font-semibold">Request signature</span>
                </Link>
                <Link
                  href="/signature-center"
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50 cursor-pointer"
                >
                  <PenLine className="h-4 w-4 text-slate-500 transition-transform duration-[120ms] group-hover:translate-x-0.5" aria-hidden />
                  <span>Create signature</span>
                </Link>
                <Link
                  href="/signature-center"
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-slate-500 transition-transform duration-[120ms] group-hover:translate-x-0.5" aria-hidden />
                  <span>Manage signatures</span>
                </Link>
              </div>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.10)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">Activity</p>
              <div className="mt-3 flex h-24 flex-col items-start justify-center gap-2 rounded-xl border border-dashed border-[#E6EBF2] bg-[#F7F9FC] px-3 text-xs text-[#6B7280]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E6EBF2]" />
                <span>No recent activity</span>
              </div>
            </div>
            <div className="flex flex-1 min-h-0 flex-col gap-[24px]">
              <div className="flex flex-[1] min-h-0 flex-col rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.10)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">Templates</p>
                <div className="mt-3 flex flex-1 flex-col items-start justify-center gap-2 rounded-xl border border-dashed border-[#E6EBF2] bg-[#F7F9FC] px-3 text-xs text-[#6B7280] min-h-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E6EBF2]" />
                  <span>No templates yet</span>
                </div>
              </div>
              <div className="flex flex-[1.35] min-h-0 items-start">
                <AIAssistantPanel className="w-full" />
              </div>
            </div>
          </aside>
        </div>
      </div>
      <ContainerShadowOverlay targetId="home-projects-container" overlayZIndex={45} />
    </main>
  );
}
