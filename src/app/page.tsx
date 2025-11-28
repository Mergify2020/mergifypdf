import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import UploadCta from "@/components/UploadCta";
import HeroStats from "@/components/HeroStats";
import { hasUsedToday } from "@/lib/quota";
import ProjectsWorkspaceShelf from "@/components/ProjectsWorkspaceShelf";
import StartProjectButton from "@/components/StartProjectButton";
import ProjectsList from "@/components/ProjectsList";
import MergifySignCard from "@/components/MergifySignCard";
import {
  ArrowUpRight,
  FileArchive,
  FileOutput,
  FilePlus,
  Highlighter,
  Layers,
  ListOrdered,
  PenLine,
  RotateCcw,
  ScissorsSquare,
  FileSignature,
} from "lucide-react";

const features = [
  {
    title: "Merge Documents",
    description: "Combine multiple PDFs into one clean file.",
    icon: Layers,
  },
  {
    title: "Edit & Annotate",
    description: "Highlight, draw, comment, and add text anywhere.",
    icon: Highlighter,
  },
  {
    title: "Sign Documents",
    description: "Draw, upload, or type your signature in seconds.",
    icon: PenLine,
  },
  {
    title: "Reorder Pages",
    description: "Drag and drop pages into the perfect order.",
    icon: ListOrdered,
  },
  {
    title: "Add or Remove Pages",
    description: "Insert new pages or delete unwanted ones.",
    icon: FilePlus,
  },
  {
    title: "Extract Pages",
    description: "Select specific pages and export them into a new PDF.",
    icon: FileOutput,
  },
  {
    title: "Compress PDF",
    description: "Reduce file size while keeping everything clear.",
    icon: FileArchive,
  },
  {
    title: "Rotate Pages",
    description: "Quickly rotate any page to the correct orientation.",
    icon: RotateCcw,
  },
  {
    title: "PDF Splitter",
    description: "Split one PDF into multiple smaller files in seconds.",
    icon: ScissorsSquare,
  },
] as const;

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
        <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:py-16 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)] lg:items-center">
            <div className="space-y-6 text-center lg:text-left">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                <span className="block">The fastest way to edit, sign,</span>
                <span className="block">and manage PDFs online.</span>
              </h1>
              <p className="text-base text-gray-700 sm:text-lg">
                Edit and sign all your business documents right in your browser.
              </p>
              <p className="text-base text-gray-600 sm:text-lg">
                Upgrade to get unlimited access to document editing and signing.
              </p>
              <div className="mt-8 flex w-full justify-center lg:justify-start">
                <UploadCta usedToday={usedToday} variant="hero" className="w-full max-w-md" />
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600 lg:justify-start">
                {["Fast performance", "Simple to use", "1 free upload per day"].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-slate-700 shadow-sm"
                  >
                    <span className="h-2 w-2 rounded-full bg-[#024d7c]" />
                    {badge}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                Trusted by freelancers, realtors, students, and small businesses.
              </p>
              <HeroStats />
            </div>

            <div className="mt-10 flex items-center justify-center lg:mt-0 lg:justify-end">
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

      <section className="bg-[#F3F4F8]">
        <div className="mx-auto w-full max-w-7xl px-6 pt-6 pb-16">
          <div className="mb-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          <section className="mt-12 mb-4 text-center">
            <h2 className="text-xl font-semibold">
              All the tools you need to work with PDFs.
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Merge, edit, sign, and organize your documents in one place.
            </p>
          </section>

          {(() => {
            const baseCardClasses =
              "rounded-2xl border border-slate-200 bg-white/95 px-5 py-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col gap-2";

            return (
              <div className="grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto mb-12">
                {features.map(({ title, description, icon: Icon }, index) => {
                  const isPrimary = index < 3;
                  return (
                    <div
                      key={title}
                      className={`${baseCardClasses} ${
                        isPrimary ? "md:bg-gradient-to-br md:from-purple-50 md:to-indigo-50" : ""
                      }`}
                    >
                      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                      <p className="mt-1 text-xs text-gray-500">{description}</p>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <p className="text-center text-base font-semibold text-slate-600">
            More tools added regularly to simplify your workflow.
          </p>
        </div>
      </section>
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
