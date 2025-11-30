import Link from "next/link";
import Image from "next/image";
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
import { ArrowUpRight } from "lucide-react";

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

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
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
            {/* Sparkle A – top-left in gradient */}
            <Sparkle
              gradientId="sparkle-top-left"
              className="pointer-events-none absolute left-4 top-10 z-20 h-7 w-7 opacity-90 sm:left-6 sm:top-12 sm:h-8 sm:w-8 md:left-8 md:top-12 md:h-9 md:w-9"
            />

            {/* Sparkle B – mid-gutter between text and screenshot */}
            <Sparkle
              gradientId="sparkle-mid-right"
              className="pointer-events-none absolute left-[52%] top-1/2 z-20 h-7 w-7 -translate-y-1/2 opacity-85 sm:left-[54%] sm:h-8 sm:w-8 md:left-[55%] md:h-9 md:w-9"
            />

            {/* Sparkle C – bottom-right accent in gradient */}
            <Sparkle
              gradientId="sparkle-right-bottom"
              className="pointer-events-none absolute bottom-6 right-6 z-20 h-7 w-7 opacity-70 sm:bottom-7 sm:right-8 sm:h-8 sm:w-8 md:bottom-8 md:right-10 md:h-9 md:w-9"
            />

            <div className="relative z-10 space-y-6 text-center lg:text-left">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                <span className="block">The fastest way to edit, sign,</span>
                <span className="block">and manage PDFs online.</span>
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
                    className="press-bounce inline-flex cursor-default items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-slate-700 shadow-sm"
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
      <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-6 py-8">
        <div className="rounded-[10px] border border-slate-200 bg-white p-6 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-[24px] font-semibold text-[#111827] sm:text-[30px]">
                Welcome back, {shortName}.
              </h1>
              <p className="text-sm text-slate-500">
                Pick up where you left off, create a new document, or send one for signature.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <StartProjectButton />
            </div>
          </header>
        </div>

        <ProjectsWorkspaceShelf />

        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <ProjectsList initialProjects={curatedProjects} />

          <div className="space-y-4">
            <MergifySignCard />
          </div>
        </section>

        <section className="pb-12" />
      </div>
    </div>
  );
}
