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
    description: "Add highlights, drawings, comments, shapes, and text.",
    icon: Highlighter,
  },
  {
    title: "Sign Documents",
    description: "Draw, upload, or type your signature instantly.",
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
    description: "Reduce file size while keeping everything clear and readable.",
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
    <div className="bg-[#F3F4F8]">
      <div className="mx-auto w-full max-w-7xl px-6 py-20">
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#FDF2FF] via-[#EEF2FF] to-[#E0F7FF] px-6 py-12 shadow-[0_32px_120px_rgba(15,23,42,0.18)] sm:px-10 sm:py-14">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)] lg:items-center">
            <div className="space-y-6 text-center lg:text-left">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
                <span className="block">The fastest way to edit, sign,</span>
                <span className="block">and manage PDFs online.</span>
              </h1>
              <p className="text-lg text-gray-700">
                Edit and sign all your business documents right in your browser.
              </p>
              <p className="text-lg text-gray-600">
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
                className="w-full max-w-xl rounded-2xl object-cover shadow-[0_40px_120px_rgba(9,20,45,0.25)]"
                priority
              />
            </div>
          </div>
        </section>

        <div className="mt-16 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="grid w-full gap-5 pb-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-4 py-4 text-center shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-1 hover:border-[#024d7c]/60 hover:shadow-xl"
            >
              <Icon className="h-8 w-8 text-[#024d7c]" aria-hidden />
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600 leading-snug">{description}</p>
            </div>
          ))}
        </div>
        <p className="pb-16 text-center text-base font-semibold text-slate-600">
          More tools added regularly to simplify your workflow.
        </p>
      </div>
    </div>
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
