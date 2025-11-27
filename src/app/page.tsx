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
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-6 py-8">
        <div className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-[1.5rem] font-bold text-[#0F172A]">
                Welcome back, {shortName}.
              </h1>
              <p className="text-sm text-slate-500">
                Pick up where you left off or start a new document.
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
            <div className="group relative overflow-hidden rounded-[18px] border border-slate-200 bg-white p-6 text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
              <div
                className="pointer-events-none absolute inset-0 rounded-[18px]"
                style={{
                  background: "radial-gradient(circle at top left, #E0EAFF 0, #FFFFFF 55%)",
                }}
              />
              <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2 md:max-w-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                    Sign documents with clients
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                    #1 Best Option — Send documents for signature
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Request legally binding signatures from clients and recipients. Track opens, reminders, and
                    completed agreements in one place.
                  </p>
                  <Link href="/signature-center" className="btn-primary mt-3 px-5 py-2.5">
                    Open Signature Center
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-4 hidden shrink-0 md:block">
                  <div className="relative rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E4FD6]/10 text-[#1E4FD6]">
                        <PenLine className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-slate-900">Signature request</p>
                        <p className="text-xs text-slate-500">Client proposal · Pending</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1 w-full rounded-full bg-slate-100">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#1E4FD6] to-[#1740AC]" />
                    </div>
                  </div>
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
