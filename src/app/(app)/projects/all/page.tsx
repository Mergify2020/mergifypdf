import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import HomeProjectsSearch from "@/components/HomeProjectsSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    where: { userId, trashedAt: null },
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

  const summaryProjects = shapedProjects.map((project) => ({
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
        <div className="projects-content-grid grid h-full w-full max-w-[1680px] min-h-0 gap-[24px] lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div
            id="home-projects-container"
            className="relative z-40 flex h-full min-h-0 w-full flex-col px-1 pb-10 pt-0 data-[shadow-overlay=true]:border-transparent data-[shadow-overlay=true]:shadow-none"
          >
            <div className="w-full">
              <HomeProjectsSearch
                firstName={firstName}
                accountName={displayName}
                accountEmail={email}
                ownerKey={userId}
                projects={summaryProjects}
                sectionLabel="All projects"
                hideHeadline
                showAllProjects
                showOwnerFilter={false}
              />
            </div>
          </div>
          <aside
            className="relative z-10 w-full min-h-0 overflow-visible"
            style={{
              marginTop: "var(--home-right-column-offset, 240px)",
            }}
          >
            <div className="flex min-h-0 flex-col gap-[24px] overflow-visible">
              <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[12px_0_36px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[12px_0_36px_rgba(0,0,0,0.45)]" style={{ height: "500px" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">
                  Templates
                </p>
                <div className="mt-3 flex flex-col items-start justify-center gap-2 rounded-xl border border-dashed border-[#E6EBF2] bg-[#F7F9FC] px-3 py-6 text-xs text-[#6B7280] dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
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
