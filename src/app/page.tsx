import Link from "next/link";
import Image from "next/image";
import UploadCta from "@/components/UploadCta";
import { hasUsedToday } from "@/lib/quota";
import ProjectsWorkspaceShelf from "@/components/ProjectsWorkspaceShelf";
import StartProjectButton from "@/components/StartProjectButton";
import ProjectsList from "@/components/ProjectsList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
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
    <div className="bg-gradient-to-b from-[#f3f8ff] via-white to-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-16 px-6 py-20 text-center">
        <div className="grid gap-12 lg:grid-cols-[1fr,1fr] lg:items-center">
          <div className="space-y-6">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              <span className="block">Merge, edit, and sign your PDFs</span>
              <span className="block">— all in your browser.</span>
            </h1>
            <p className="text-lg text-gray-700">A better, simpler way to work with your documents.</p>
            <p className="text-lg text-gray-600">
              One free upload every day. Upgrade for unlimited merges and faster processing.
            </p>
            <div className="mt-8 flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <UploadCta usedToday={usedToday} variant="hero" className="w-full sm:w-auto" />
              <Link
                href="/account?view=pricing"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-10 py-4 text-base font-semibold text-[#024d7c] shadow-sm transition hover:-translate-y-0.5"
              >
                Pricing
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600">
              {["Blazing fast", "Privacy-first", "1 free upload per day"].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-slate-700 shadow-sm"
                >
                  <span className="h-2 w-2 rounded-full bg-[#024d7c]" />
                  {badge}
                </span>
              ))}
            </div>
            <p className="text-sm text-slate-500">Loved by freelancers, students, and small businesses.</p>
          </div>
          <div className="relative mt-12 flex items-center justify-center lg:mt-12">
            <div className="pointer-events-none absolute -bottom-6 -right-6 h-72 w-72 rounded-full bg-indigo-100/60 blur-[140px]" />
            <Image
              src="/visual-hero2.jpeg"
              alt="Preview of the MergifyPDF editor"
              width={900}
              height={700}
              className="relative w-full max-w-xl rounded-[32px] object-cover shadow-[0_40px_120px_rgba(9,20,45,0.25)]"
              priority
            />
          </div>
        </div>

        <div className="mt-20 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="grid w-full gap-5 pb-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white/70 p-6 text-center shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-1 hover:border-[#024d7c]/60 hover:shadow-xl"
            >
              <Icon className="h-[2.4rem] w-[2.4rem] text-[#024d7c]" aria-hidden />
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
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
                Your workspace is ready, {shortName}.
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
            <div className="relative overflow-hidden rounded-[10px] border border-slate-200 bg-[linear-gradient(135deg,#F9FBFF_0%,#E7F0FF_100%)] text-slate-600 shadow-[0_14px_30px_rgba(15,23,42,0.10)]">
              <div className="h-1 w-full bg-[#1C80D6]" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 text-[#1C80D6] opacity-[0.04]">
                <svg
                  aria-hidden
                  className="h-40 w-40"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="14" y="10" width="32" height="44" rx="3" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M22 20H38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M22 27H34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <path
                    d="M22 40C24 42.2 26.5 43.5 29 43.5C32 43.5 33.5 41.5 36.5 41.5C38.7 41.5 40.3 42.3 41.5 43.5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="relative z-10 flex items-stretch justify-between gap-5 p-5">
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
                        Mergify Sign
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#6B7280]">
                        Professional document signing
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-[#D3E2FF] bg-white/90 px-[10px] py-[3px] text-[11px] font-medium text-[#1C80D6]">
                      Pro feature
                    </span>
                  </div>
                  <h3 className="text-[18px] font-semibold text-[#111827]">
                    Request a Signature
                  </h3>
                  <p className="max-w-[420px] text-sm leading-relaxed text-[#4B5563]">
                    Get contracts and important documents signed fast, with reminders and completion tracking built in.
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-[13px] text-[#4B5563]">
                    <span className="inline-flex items-center rounded-full border border-[#D3E2FF] bg-white px-3 py-1.5">
                      Remote signatures
                    </span>
                    <span className="inline-flex items-center rounded-full border border-[#D3E2FF] bg-white px-3 py-1.5">
                      Reminder scheduling
                    </span>
                    <span className="inline-flex items-center rounded-full border border-[#D3E2FF] bg-white px-3 py-1.5">
                      Completion tracking
                    </span>
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/signature-center"
                      className="inline-flex h-11 items-center justify-center rounded-[8px] bg-[#3B82F6] px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#2563EB]"
                    >
                      Open Signature Requests
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
                <div className="ml-2 hidden h-[120px] w-[120px] flex-shrink-0 items-center justify-center rounded-[12px] border border-[#D3E2FF] bg-[#F1F6FF] sm:flex">
                  <svg
                    aria-hidden
                    className="h-16 w-16 text-[#1C80D6]"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="16" y="10" width="28" height="40" rx="3" stroke="currentColor" strokeWidth="2.5" />
                    <path d="M22 20H38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M22 27H34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <path
                      d="M22 40C24 42.2 26.5 43.5 29 43.5C32 43.5 33.5 41.5 36.5 41.5C38.7 41.5 40.3 42.3 41.5 43.5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-12" />
      </div>
    </div>
  );
}
