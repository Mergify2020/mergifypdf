import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { LayoutDashboard, ArrowUpRight, Sparkles } from "lucide-react";
import { authOptions } from "@/lib/authOptions";
import UploadCta from "@/components/UploadCta";
import HeroStats from "@/components/HeroStats";
import HeroFeatureArea from "@/components/HeroFeatureArea";
import PersonaHighlight from "@/components/PersonaHighlight";
import LogoCarousel from "@/components/LogoCarousel";
import { hasUsedToday } from "@/lib/quota";
import ProjectsWorkspaceShelf from "@/components/ProjectsWorkspaceShelf";
import StartProjectButton from "@/components/StartProjectButton";
import DashboardInsightsColumn from "@/components/DashboardInsightsColumn";
import { getAvatarFallback } from "@/lib/avatarFallback";

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
        avatarUrl={session.user.image ?? null}
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

function ProjectsDashboard({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string | null;
}) {
  const shortName = displayName.split(" ")[0] ?? "Guest";
  const fallbackAvatar = getAvatarFallback(avatarUrl ?? displayName, displayName);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F7FB] via-[#F3F3F7] to-[#ECEEF3] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-8 lg:px-6">
        {/* Welcome hero */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg sm:p-7">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={shortName}
                    width={40}
                    height={40}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center"
                    style={{ backgroundColor: fallbackAvatar.color }}
                  >
                    {fallbackAvatar.initials}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </p>
                <h1 className="text-[24px] font-semibold text-[#111827] sm:text-[30px]">
                  Welcome back, {shortName}.
                </h1>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <StartProjectButton />
            </div>
          </header>
        </section>

        <section className="grid gap-y-6 lg:grid-cols-[minmax(0,2.05fr)_minmax(0,1.3fr)] lg:gap-x-10">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
              <p className="text-sm font-semibold text-slate-500">Get started</p>
              <h2 className="mt-2 text-[28px] font-semibold text-slate-900 sm:text-[32px]">
                What do you want to do today?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload a PDF, continue editing, or send documents out for signature.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/studio"
                  className="inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 text-base font-semibold text-white shadow-lg transition hover:shadow-xl"
                >
                  Start a New Project
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/signature-center"
                  className="inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
                >
                  Send a Signature Request
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <ProjectsWorkspaceShelf />

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quick links
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">Jump back in</h3>
                </div>
                <Link
                  href="/projects"
                  className="text-sm font-semibold text-sky-600 transition hover:text-sky-500"
                >
                  View all →
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: "Your Projects",
                    description: "Manage documents, uploads, and drafts.",
                    href: "/projects",
                  },
                  {
                    title: "Signature Dashboard",
                    description: "Track requests, reminders, and completions.",
                    href: "/signature-center",
                  },
                  {
                    title: "Templates",
                    description: "Reuse contracts, NDAs, and forms quickly.",
                    href: "/signature-center",
                  },
                ].map((link) => (
                  <Link
                    key={link.title}
                    href={link.href}
                    className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
                  >
                    <p className="text-base font-semibold text-slate-900">{link.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{link.description}</p>
                    <span className="mt-3 inline-flex items-center text-sm font-semibold text-sky-600">
                      Open
                      <ArrowUpRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <DashboardInsightsColumn />
        </section>

        <section className="pb-8" />
      </div>
    </div>
  );
}
