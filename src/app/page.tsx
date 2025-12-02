import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import UploadCta from "@/components/UploadCta";
import HeroStats from "@/components/HeroStats";
import HeroFeatureArea from "@/components/HeroFeatureArea";
import PersonaHighlight from "@/components/PersonaHighlight";
import LogoCarousel from "@/components/LogoCarousel";
import { hasUsedToday } from "@/lib/quota";
import ProjectsWorkspaceShelf from "@/components/ProjectsWorkspaceShelf";
import StartProjectButton from "@/components/StartProjectButton";
import ProjectsList from "@/components/ProjectsList";
import MergifySignCard from "@/components/MergifySignCard";

const curatedProjects = [
  {
    id: "client-audit",
    title: "Client Audit Packet",
    subtitle: "Golden Rain Masonry • 36 pages",
    status: "In review",
    updated: "Today • 9:24 AM",
  },
  {
    id: "vendor-lux",
    title: "Vendor Renewal Agreement",
    subtitle: "Pinnacol Assurance • 12 pages",
    status: "Awaiting signature",
    updated: "Yesterday • 4:08 PM",
  },
  {
    id: "compliance-deck",
    title: "Compliance Addendum",
    subtitle: "MergifyPDF Studio • 8 pages",
    status: "Draft",
    updated: "Tuesday • 10:41 AM",
  },
];

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

type HomeProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolved = (searchParams ?? {}) as Record<string, string | string[] | undefined>;
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
    return <ProjectsDashboard displayName={session.user.name ?? session.user.email ?? "Guest"} />;
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

function ProjectsDashboard({ displayName }: { displayName: string }) {
  const shortName = displayName.split(" ")[0] ?? "Guest";

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-6 py-8">
        {/* Welcome hero */}
        <section className="rounded-[18px] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:p-7">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#9CA3AF]">
                Dashboard
              </p>
              <h1 className="text-[24px] font-semibold text-[#111827] sm:text-[30px]">
                Welcome back, {shortName}.
              </h1>
              <p className="max-w-xl text-sm text-slate-500">
                Quickly jump into your workspace, pick up a recent project, or send a document for
                signature.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <StartProjectButton />
            </div>
          </header>
        </section>

        {/* Main content: left = work, right = tools */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,2.15fr)_minmax(0,1.5fr)]">
          {/* Left column: primary work area */}
          <div className="space-y-6">
            <ProjectsWorkspaceShelf />
            <ProjectsList initialProjects={curatedProjects} />
          </div>

          {/* Right column: tools & upcoming features */}
          <div className="space-y-5">
            <MergifySignCard />

            {/* Document templates */}
            <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#9CA3AF]">
                Document templates
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
                Reuse-ready documents for your workflows
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                W-9 forms, contracts, invoices, NDAs, and more. Save your most used document
                structures and start from a polished base instead of a blank page.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center text-sm font-semibold text-[#024d7c] hover:text-[#013a60]"
              >
                Browse Templates
                <span className="ml-1">→</span>
              </button>
            </div>

            {/* AI tools (coming soon) */}
            <div className="rounded-[16px] border border-transparent bg-gradient-to-br from-pink-50 via-purple-50 to-sky-50 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    AI tools (coming soon)
                  </p>
                  <h2 className="mt-2 text-lg font-semibold leading-snug text-slate-900">
                    Let AI handle the busywork
                  </h2>
                </div>
                <span className="mt-1 inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                  Preview
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                We&apos;re building helpers that understand your PDFs so you can stay focused on the
                work that matters.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                <li>• Summarize PDFs</li>
                <li>• Rewrite or simplify text</li>
                <li>• Smart form detection</li>
              </ul>
              <p className="mt-4 text-xs text-slate-500">
                Watch this space — new AI features will roll out directly into your workspace.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-10" />
      </div>
    </div>
  );
}
