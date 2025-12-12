import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Search, SlidersHorizontal } from "lucide-react";
import { authOptions } from "@/lib/authOptions";
import UploadCta from "@/components/UploadCta";
import HeroStats from "@/components/HeroStats";
import HeroFeatureArea from "@/components/HeroFeatureArea";
import PersonaHighlight from "@/components/PersonaHighlight";
import LogoCarousel from "@/components/LogoCarousel";
import { hasUsedToday } from "@/lib/quota";
import RecentProjectsRow from "@/components/RecentProjectsRow";
import StartProjectButton from "@/components/StartProjectButton";
import { prisma } from "@/lib/prisma";

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

  const session = await getServerSession(authOptions);

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
    return (
      <ProjectsDashboard
        displayName={session.user.name ?? session.user.email ?? "Guest"}
        userId={session.user.id}
      />
    );
  }

  const usedToday = await hasUsedToday();
  return <MarketingLanding usedToday={usedToday} />;
}

function MarketingLanding({ usedToday }: { usedToday: boolean }) {
  return (
    <>
      <section className="w-full bg-gradient-to-r from-[#FDF2FF] via-[#EEF2FF] to-[#E0F7FF]">
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

async function ProjectsDashboard({ displayName, userId }: { displayName: string; userId: string }) {
  const firstName = displayName.split(" ")[0] ?? "there";
  const shapedRecent = await prisma.$queryRaw<
    { id: string; name: string; updatedAt: Date; previewUrl: string | null }[]
  >`
    SELECT id, name, "updatedAt", "previewUrl"
    FROM "Project"
    WHERE "userId" = ${userId}
      AND COALESCE((data->>'trashed')::boolean, false) = false
    ORDER BY "updatedAt" DESC
    LIMIT 6
  `;

  return (
    <main className="min-h-screen w-full bg-slate-100 px-2 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <div
        className="mx-auto mb-6 flex min-h-[calc(100vh-4rem)] w-full flex-col rounded-[32px] border border-white/70 bg-white px-4 pb-12 pt-14 sm:mb-8 sm:px-6 lg:px-10"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(0, 157, 253, 0.28) 0%, rgba(0, 157, 253, 0.18) 22%, rgba(255, 255, 255, 0) 70%)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 420px",
        }}
      >
        <div className="w-full">
          <section>
            <header className="flex flex-col items-center justify-center text-center">
              <p className="text-xl font-semibold text-[#013d63]">Welcome back, {firstName}.</p>
              <h1 className="mt-2 text-[36px] sm:text-[44px] lg:text-[58px] font-medium tracking-tight text-[#013d63]">
                What will you work on today?
              </h1>
            </header>
            <div className="mt-10 flex justify-center">
              <div className="w-full max-w-4xl rounded-[42px] border-[3px] border-[#0f6fb8] bg-white/95 px-5 py-3 text-[#013d63] shadow-[0_8px_20px_rgba(15,111,184,0.16)]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col items-center gap-2 sm:pr-5">
                    <div className="text-center">
                      <h3 className="text-base font-semibold text-[#013d63]">Start a new project</h3>
                    </div>
                    <StartProjectButton
                      variant="custom"
                      className="inline-flex h-9 w-full max-w-xs items-center justify-center rounded-[10px] bg-[#019dfd] px-6 text-sm font-semibold text-white shadow-[0_3px_9px_rgba(0,157,253,0.25)] transition hover:-translate-y-0.5 hover:bg-[#0185d6]"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2 pt-3 sm:border-l sm:border-slate-300 sm:pl-5 sm:pt-0">
                    <div className="text-center">
                      <h3 className="text-base font-semibold text-[#013d63]">Send a Signature Request</h3>
                    </div>
                    <Link
                      href="/signature-center"
                      className="inline-flex h-9 w-full max-w-xs items-center justify-center rounded-[10px] bg-[#6A4EE8] px-6 text-sm font-semibold text-white shadow-[0_3px_9px_rgba(0,157,253,0.25)] transition hover:-translate-y-0.5 hover:bg-[#5C3EDB]"
                    >
                      Go to Signature Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-center">
              <div className="w-full max-w-4xl">
                <div className="flex items-center rounded-[999px] border-[3px] border-[#0f6fb8] bg-white px-6 py-[18px] text-base text-[#013d63] shadow-[0_8px_25px_rgba(15,111,184,0.25)]">
                  <Search className="h-5 w-5 text-sky-500 sm:h-6 sm:w-6" aria-hidden />
                  <input
                    type="text"
                    placeholder="Search projects and documents"
                    className="ml-4 flex-1 border-none bg-transparent text-base text-[#013d63] placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:text-lg"
                  />
                  <button
                    type="button"
                    className="ml-4 hidden rounded-full border border-[#013d63]/20 bg-white px-4 py-2 text-sm font-semibold text-[#013d63] shadow-[0_4px_14px_rgba(1,61,99,0.2)] transition hover:bg-[#013d63] hover:text-white sm:inline-flex sm:items-center sm:gap-2"
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                    <span>Filters</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-7 w-full">
            <div className="pt-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Recent projects</h2>
                </div>
              </div>
              <div className="mt-6">
                <RecentProjectsRow initialProjects={shapedRecent} />
              </div>
              <div className="mt-6 flex justify-center">
                <Link
                  href="/projects/all"
                  className="inline-flex h-10 items-center justify-center rounded-[12px] bg-[#019dfd] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,157,253,0.25)] transition hover:-translate-y-0.5 hover:bg-[#0185d6]"
                >
                  View all projects
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
