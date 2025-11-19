import Link from "next/link";
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
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-20 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl leading-tight">
        <span className="block">Merge and edit your documents</span>
        <span className="block">all in one place</span>
      </h1>
      <p className="text-lg text-gray-700">Fast, secure, and works right in your browser.</p>
      <p className="text-lg text-gray-600">
        One free upload each day. Sign up for unlimited merges and faster processing.
      </p>
      <UploadCta usedToday={usedToday} />
      <p className="text-sm text-gray-500">
        Already have an account?{" "}
        <Link className="underline decoration-[#024d7c]" href="/login">
          Log in
        </Link>
        .
      </p>
      <div className="mt-4 text-center text-slate-900">
        <h2 className="text-2xl font-semibold">Unlock unlimited uploads and team workspaces.</h2>
        <Link
          href="/account?view=pricing"
          className="mx-auto mt-6 inline-flex w-full max-w-xl items-center justify-center rounded-full bg-gradient-to-r from-[#0ea5e9] via-[#2563eb] to-[#4c1d95] px-12 py-5 text-xl font-semibold text-white shadow-[0_25px_60px_rgba(37,99,235,0.35)] transition hover:-translate-y-1"
        >
          View pricing
        </Link>
      </div>
      <div className="mt-12 grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ title, description, icon: Icon }) => (
          <div
            key={title}
            className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white/40 p-6 text-center shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-1 hover:border-[#024d7c]/60 hover:shadow-xl"
          >
            <Icon className="h-[2.4rem] w-[2.4rem] text-[#024d7c]" aria-hidden />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        ))}
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
