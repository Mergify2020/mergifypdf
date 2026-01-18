import Link from "next/link";
import { FileText, PenLine, Send } from "lucide-react";
import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import HomeProjectsSearch from "@/components/HomeProjectsSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isTrashedProject(data: unknown) {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  return record.trashed === true;
}

export default async function AllProjectsPage() {
  const session = await getServerSessionSafe();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.twoFactorEnabled && !session.user.twoFactorPassed) {
    redirect("/2fa");
  }

  const userId = session.user.id;
  if (!userId) {
    redirect("/login");
  }

  const displayName = session.user.name ?? session.user.email ?? "Guest";
  const email = session.user.email ?? null;
  const firstName = displayName.split(" ")[0] ?? "there";

  const shapedProjects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 60,
    select: {
      id: true,
      name: true,
      updatedAt: true,
      pagesCount: true,
      previewKey: true,
      pdfKey: true,
      data: true,
    },
  });

  const visibleProjects = shapedProjects.filter((project) => !isTrashedProject(project.data));
  const summaryProjects = visibleProjects.map((project) => ({
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    pagesCount: project.pagesCount ?? 0,
    previewUrl: null,
    pdfUrl: null,
    hasPreview: !!project.previewKey,
    rotation: (() => {
      if (!project.data || typeof project.data !== "object") return 0;
      const record = project.data as Record<string, unknown>;
      const pages = Array.isArray(record.pages) ? record.pages : null;
      if (!pages || pages.length === 0) return 0;
      const first = pages[0];
      if (!first || typeof first !== "object") return 0;
      return typeof (first as { rotation?: unknown }).rotation === "number"
        ? (first as { rotation: number }).rotation
        : 0;
    })(),
  }));

  return (
    <main className="h-screen w-full bg-[#F1F4F9] py-6 dark:bg-[#222224]">
      <div className="w-full">
        <div className="grid h-full w-full max-w-[1680px] min-h-0 gap-[24px] lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div
            id="home-projects-container"
            className="relative z-40 flex h-full min-h-0 w-full flex-col px-1 pb-10 pt-0 data-[shadow-overlay=true]:border-transparent data-[shadow-overlay=true]:shadow-none"
          >
            <div className="w-full">
              <HomeProjectsSearch
                firstName={firstName}
                accountName={displayName}
                accountEmail={email}
                projects={summaryProjects}
                sectionLabel="All projects"
                hideHeadline
                showAllProjects
                showOwnerFilter={false}
              />
            </div>
          </div>
          <aside
            id="home-sidebar"
            className="scrollbar-thumb-only relative z-10 flex w-full flex-col min-h-0 overflow-y-auto pr-1"
            style={{
              marginTop: "var(--home-right-column-offset, 240px)",
              height: "calc(100vh - var(--home-right-column-offset, 240px) - 48px)",
              gap: "var(--home-section-gap, 24px)",
            }}
          >
            <div className="flex flex-col gap-[24px]">
              <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                <Link
                  href="/signature-center"
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] hover:text-[#4B5563] dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  SIGN DOCUMENTS
                </Link>
                <div className="no-theme-transition mt-3 flex flex-col text-sm font-medium text-slate-700 dark:text-zinc-200">
                  <Link
                    href="/signature-center"
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer"
                  >
                    <Send
                      className="h-4 w-4 text-[#4F46E5] transition-transform duration-[120ms] group-hover:translate-x-0.5 dark:text-zinc-200"
                      aria-hidden
                    />
                    <span className="font-semibold">Request signature</span>
                  </Link>
                  <Link
                    href="/signature-center"
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer"
                  >
                    <PenLine
                      className="h-4 w-4 text-slate-500 transition-transform duration-[120ms] group-hover:translate-x-0.5 dark:text-zinc-400"
                      aria-hidden
                    />
                    <span>Create signature</span>
                  </Link>
                  <Link
                    href="/signature-center"
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer"
                  >
                    <FileText
                      className="h-4 w-4 text-slate-500 transition-transform duration-[120ms] group-hover:translate-x-0.5 dark:text-zinc-400"
                      aria-hidden
                    />
                    <span>Manage signatures</span>
                  </Link>
                </div>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">
                  Activity
                </p>
                <div className="mt-3 flex h-24 flex-col items-start justify-center gap-2 rounded-xl border border-dashed border-[#E6EBF2] bg-[#F7F9FC] px-3 text-xs text-[#6B7280] dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E6EBF2] dark:bg-zinc-700" />
                  <span>No recent activity</span>
                </div>
              </div>
              <div className="flex flex-[1] min-h-0 flex-col rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">
                  Templates
                </p>
                <div className="mt-3 flex flex-1 flex-col items-start justify-center gap-2 rounded-xl border border-dashed border-[#E6EBF2] bg-[#F7F9FC] px-3 text-xs text-[#6B7280] min-h-0 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E6EBF2] dark:bg-zinc-700" />
                  <span>No templates yet</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
