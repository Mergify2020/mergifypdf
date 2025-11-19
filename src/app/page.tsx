import Link from "next/link";
import UploadCta from "@/components/UploadCta";
import { hasUsedToday } from "@/lib/quota";
import ProjectsWorkspaceShelf from "@/components/ProjectsWorkspaceShelf";
import StartProjectButton from "@/components/StartProjectButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ArrowUpRight, CalendarDays, FileOutput, FilePlus, Highlighter, Layers, ListOrdered, PenLine } from "lucide-react";

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
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-8 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
              >
                Upgrade to Premium
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <ProjectsWorkspaceShelf />

        <section className="grid gap-5 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-[36px] border border-white/60 bg-white/95 p-8 shadow-[0_40px_120px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Your projects</h2>
              </div>
              <Link
                href="/studio"
                className="inline-flex items-center text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              >
                View all
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 divide-y divide-slate-100">
              {curatedProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-semibold text-slate-900">{project.title}</p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 20h9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M16.5 3.5a2.121 2.121 0 013 3L7 19.5 3 21l1.5-4L16.5 3.5z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Edit
                    </button>
                  <p className="text-sm text-slate-500">Last edited {project.updated}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-slate-600">
                      <CalendarDays className="h-4 w-4" />
                      {project.updated}
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      Download
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 5v10m0 0l-4-4m4 4l4-4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5 19h14"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    <Link
                      href="/studio"
                      className="inline-flex items-center gap-1 rounded-full bg-[#024d7c] px-3 py-1 text-white transition hover:bg-[#013a60]"
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
            <div className="rounded-[36px] border border-dashed border-slate-200 bg-white/95 p-6 text-slate-500 shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
              <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Team Hub workspace</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">Coming soon</h3>
              <p className="mt-1 text-sm">
                Invite collaborators, organize shared stacks, and stay perfectly in sync. We&apos;re
                polishing the experience—stay tuned.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-12" />
      </div>
    </div>
  );
}
