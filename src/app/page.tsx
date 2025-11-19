import Link from "next/link";
import Image from "next/image";
import UploadCta from "@/components/UploadCta";
import { hasUsedToday } from "@/lib/quota";
import ProjectsWorkspaceShelf from "@/components/ProjectsWorkspaceShelf";
import StartProjectButton from "@/components/StartProjectButton";
import ProjectsList from "@/components/ProjectsList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ArrowUpRight, FileOutput, FilePlus, Highlighter, Layers, ListOrdered, PenLine } from "lucide-react";

const features = [
  {
    title: "Merge Documents",
    description: "Combine multiple PDFs into one clean file.",
    icon: Layers,
  },
  {
    title: "Edit & Highlight",
    description: "Add highlights, notes, drawings, and text.",
    icon: Highlighter,
  },
  {
    title: "Sign Documents",
    description: "Draw, upload, or type your signature.",
    icon: PenLine,
  },
  {
    title: "Reorder Pages",
    description: "Drag and drop pages to arrange your document.",
    icon: ListOrdered,
  },
  {
    title: "Add or Remove Pages",
    description: "Insert new pages or delete pages instantly.",
    icon: FilePlus,
  },
  {
    title: "Extract Pages",
    description: "Select certain pages and export them into a new PDF.",
    icon: FileOutput,
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
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr,1fr] lg:items-center">
          <div className="space-y-6 text-center lg:text-left">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              <span className="block">Merge, edit, and sign your PDFs</span>
              <span className="block">— all in your browser.</span>
            </h1>
            <p className="text-lg text-gray-700">Fast, secure, and works right in your browser.</p>
            <p className="text-lg text-gray-600">
              One free upload every day. Upgrade for unlimited merges and faster processing.
            </p>
            <div className="mt-8 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-start">
              <UploadCta usedToday={usedToday} variant="hero" className="w-full sm:w-auto" />
              <Link
                href="/account?view=pricing"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-10 py-4 text-base font-semibold text-[#024d7c] shadow-sm transition hover:-translate-y-0.5"
              >
                Pricing
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600 lg:justify-start">
              {["Fast & secure", "No signup required", "Works in your browser"].map((badge) => (
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
          <div className="relative mt-12 flex items-center justify-center lg:mt-4">
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

        <div className="mt-16 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="grid w-full gap-5 pb-12 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>
    </div>
  );
}

function ProjectsDashboard({ displayName }: { displayName: string }) {
  const shortName = displayName.split(" ")[0] ?? "Guest";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f4f7fb] to-white text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <div className="rounded-[46px] border border-white/60 bg-white/95 p-10 shadow-[0_45px_120px_rgba(15,23,42,0.1)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
                Welcome back, {shortName}.
              </h1>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <StartProjectButton />
            </div>
          </div>
        </div>

        <ProjectsWorkspaceShelf />

        <section className="grid gap-5 lg:grid-cols-[2fr,1fr]">
          <ProjectsList initialProjects={curatedProjects} />

          <div className="space-y-4">
            <div className="rounded-[36px] border border-dashed border-slate-200 bg-white/95 p-6 text-slate-500 shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
              <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Team Hub workspace</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">Upgrade to Premium</h3>
              <p className="mt-1 text-sm">
                Unlock the Team Hub to invite collaborators, organize shared stacks, and stay perfectly in sync.
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#f97316] to-[#fb7185] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#f97316]/30 transition hover:opacity-90"
              >
                Upgrade to Premium
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="pb-12" />
      </div>
    </div>
  );
}
