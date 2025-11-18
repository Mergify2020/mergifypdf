import Link from "next/link";
import UploadCta from "@/components/UploadCta";
import { hasUsedToday } from "@/lib/quota";
import ProjectsWorkspaceShelf from "@/components/ProjectsWorkspaceShelf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  FileOutput,
  FilePlus,
  FileSignature,
  FolderKanban,
  Highlighter,
  Layers,
  ListOrdered,
  PenLine,
  Sparkles,
} from "lucide-react";

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

const templateBlocks = [
  {
    label: "Audit Room",
    description: "Collect binders, reorder statements, archive supporting docs.",
    accent: "from-[#1f80ff]/60 via-[#1f49ff]/50 to-transparent",
  },
  {
    label: "Signature Suite",
    description: "Invite clients, capture initials, unlock ready-to-send packets.",
    accent: "from-[#34d399]/60 via-[#059669]/50 to-transparent",
  },
  {
    label: "Board Review",
    description: "Bundle decks, swap pages, and export pristine PDFs in minutes.",
    accent: "from-[#fda4af]/60 via-[#fb7185]/50 to-transparent",
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
          Sign in
        </Link>
        .
      </p>
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
    <div className="relative min-h-screen bg-[#040b17] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#12336f_0%,transparent_45%),radial-gradient(circle_at_bottom,#04233f_0%,transparent_35%)] opacity-80" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_40px_120px_rgba(2,10,22,0.65)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-white/60">Projects</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight">Welcome back, {shortName}.</h1>
              <p className="mt-3 max-w-2xl text-base text-white/70" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/studio"
                className="inline-flex items-center justify-center rounded-full bg-white px-10 py-3 text-base font-semibold text-slate-900 shadow-xl shadow-black/20 transition hover:-translate-y-0.5"
              >
                Start a new project
                <ArrowUpRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        <ProjectsWorkspaceShelf />

        <section className="grid gap-5 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-white/60">Recent projects</p>
                <h2 className="text-2xl font-semibold">Continue where you paused</h2>
              </div>
              <Link
                href="/studio"
                className="inline-flex items-center text-sm font-semibold text-white/70 transition hover:text-white"
              >
                View all
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 divide-y divide-white/10">
              {curatedProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-lg font-semibold">{project.title}</p>
                    <p className="text-sm text-white/60">{project.subtitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-white/80">
                      <CalendarDays className="h-4 w-4" />
                      {project.updated}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-white/80">
                      <Sparkles className="h-4 w-4" />
                      {project.status}
                    </span>
                    <Link
                      href="/studio"
                      className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-white transition hover:bg-white/20"
                    >
                      Open
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.4em] text-white/60">Trusted tools</p>
              <h3 className="mt-2 text-xl font-semibold">Signature-ready</h3>
              <p className="mt-1 text-sm text-white/70">
                One tap to add initials, drop company stamps, or share a review link.
              </p>
              <div className="mt-4 flex gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1">
                  <FileSignature className="h-4 w-4" /> Sign
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1">
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.4em] text-white/60">Team Hubs</p>
              <h3 className="mt-2 text-xl font-semibold">Shared spaces</h3>
              <p className="mt-1 text-sm text-white/70">
                Keep audit packets, board decks, and compliance letters inside curated stacks.
              </p>
              <Link
                href="/studio"
                className="mt-4 inline-flex items-center text-sm font-semibold text-white/80 transition hover:text-white"
              >
                View spaces
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-12 lg:grid-cols-3">
          {templateBlocks.map((block) => (
            <div
              key={block.label}
              className={`rounded-3xl border border-white/10 bg-gradient-to-br ${block.accent} p-6 shadow-lg shadow-black/30`}
            >
              <p className="text-sm uppercase tracking-[0.4em] text-white/70">{block.label}</p>
              <p className="mt-2 text-lg text-white">{block.description}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white/90">
                <FolderKanban className="h-4 w-4" />
                Launch
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
