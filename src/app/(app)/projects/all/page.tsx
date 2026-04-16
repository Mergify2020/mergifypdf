import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerSessionSafe } from "@/lib/serverSession";
import {
  clearPrismaDatabaseUnavailable,
  isPrismaDatabaseCooldownActive,
  markPrismaDatabaseUnavailable,
  prisma,
} from "@/lib/prisma";
import { getR2Config, getR2ObjectSize } from "@/lib/r2";
import HomeProjectsSearch from "@/components/HomeProjectsSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function extractFileSizeFromData(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const sources = Array.isArray(record.sources) ? record.sources : null;
  if (!sources || sources.length === 0) return null;

  const sizes = sources
    .map((source) =>
      source && typeof source === "object" && typeof (source as { size?: unknown }).size === "number"
        ? (source as { size: number }).size
        : null
    )
    .filter((size): size is number => typeof size === "number" && Number.isFinite(size) && size >= 0);

  if (sizes.length === 0) return null;
  return sizes.reduce((total, size) => total + size, 0);
}

export default function AllProjectsPage() {
  return (
    <Suspense fallback={<AllProjectsFallback />}>
      <AllProjectsContent />
    </Suspense>
  );
}

function AllProjectsFallback() {
  return (
    <main
      className="box-border w-full bg-[#F1F4F9] pt-3 pb-0 md:pt-6 md:pb-0 dark:bg-[#252525]"
      style={{
        height:
          "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px) - var(--home-topbar-offset, 0px) - var(--workspace-content-bottom-subtract, var(--workspace-frame-gutter, 48px)))",
      }}
    >
      <div className="h-full min-h-0 w-full">
        <div className="h-full w-full">
          <div
            id="home-projects-container"
            className="relative z-40 flex h-full min-h-0 w-full flex-col px-0 pt-0 data-[shadow-overlay=true]:border-transparent data-[shadow-overlay=true]:shadow-none md:pl-1 md:pr-0"
          >
            <div className="flex h-full min-h-0 w-full flex-col">
              <div className="mt-0 flex w-full min-h-0 flex-1 flex-col">
                <div className="box-border flex min-h-0 flex-1 flex-col rounded-xl border-[1.5px] border-gray-200 bg-white p-3 shadow-sm dark:border-[#3F3F3F] dark:bg-[#323232] dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] md:p-5">
                  <div className="flex flex-row items-center justify-between gap-2 md:gap-4 md:pl-[21px]">
                    <div className="h-7 w-40 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#2B2B2B]/70" />
                    <div className="flex min-w-0 shrink items-center justify-end gap-1.5 md:gap-2">
                      <div className="h-[34px] w-[110px] rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#2B2B2B]/70" />
                      <div className="h-[34px] w-[96px] rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#2B2B2B]/70" />
                    </div>
                  </div>
                  <div className="recent-projects-container mt-6 flex-1 overflow-y-hidden overflow-x-hidden" style={{ paddingRight: 6, paddingLeft: 6, paddingBottom: 6 }}>
                    <div className="recent-projects-grid projects-grid mt-2 grid w-full max-w-[1880px] items-start gap-4 sm:gap-6">
                      {Array.from({ length: 12 }).map((_, index) => (
                        <div key={`all-projects-fallback-${index}`} className="flex w-full flex-col text-left">
                          <div className="relative rounded-[10px] bg-[#F9FAFC] dark:bg-[#323232]/60">
                            <div className="relative m-[3px] aspect-square w-[calc(100%-6px)] overflow-hidden rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-[#EEF1F5] dark:border-[#3A3A3A] dark:bg-[#2B2B2B]/70">
                              <div className="absolute inset-0 rounded-[10px] skeleton-shimmer opacity-90" />
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="h-5 w-[72%] rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#2B2B2B]/70" />
                            <div className="h-3.5 w-[48%] rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#2B2B2B]/70" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

async function AllProjectsContent() {
  const session = await getServerSessionSafe();
  const cookieStore = await cookies();

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
  const persistedViewMode = cookieStore.get("mpdf:all-projects-view-mode")?.value;
  const initialViewMode = persistedViewMode === "list" ? "list" : "grid";

  let shapedProjects: Array<{
    id: string;
    name: string | null;
    updatedAt: Date;
    pagesCount: number | null;
    previewKey: string | null;
    pdfKey: string | null;
    data: unknown;
  }> = [];

  if (!isPrismaDatabaseCooldownActive()) {
    try {
      shapedProjects = await prisma.project.findMany({
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
      clearPrismaDatabaseUnavailable();
    } catch (error) {
      markPrismaDatabaseUnavailable(error);
      if (process.env.NODE_ENV === "production") {
        console.error("[projects/all] Failed to load projects from DB; rendering fallback.");
      } else {
        console.warn("[projects/all] Failed to load projects from DB; rendering fallback.");
      }
    }
  }

  let r2Config: ReturnType<typeof getR2Config> | null = null;
  try {
    r2Config = getR2Config();
  } catch {
    r2Config = null;
  }

  const summaryProjects = await Promise.all(
    shapedProjects.map(async (project) => {
      let fileSizeBytes: number | null = null;
      if (r2Config && project.pdfKey) {
        try {
          fileSizeBytes = await getR2ObjectSize(r2Config, project.pdfKey);
        } catch {
          fileSizeBytes = extractFileSizeFromData(project.data);
        }
      } else {
        fileSizeBytes = extractFileSizeFromData(project.data);
      }

      return {
        id: project.id,
        name: project.name ?? "Untitled project",
        updatedAt: project.updatedAt,
        pagesCount: project.pagesCount ?? 0,
        previewUrl: null,
        pdfUrl: null,
        hasPreview: !!project.previewKey,
        fileSizeBytes,
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
      };
    })
  );

  return (
    <main
      className="box-border w-full bg-[#F1F4F9] pt-3 pb-0 md:pt-6 md:pb-0 dark:bg-[#252525]"
      style={{
        height:
          "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px) - var(--home-topbar-offset, 0px) - var(--workspace-content-bottom-subtract, var(--workspace-frame-gutter, 48px)))",
      }}
    >
      <div className="h-full min-h-0 w-full">
        <div className="h-full w-full">
          <div
            id="home-projects-container"
            className="relative z-40 flex h-full min-h-0 w-full flex-col px-0 pt-0 data-[shadow-overlay=true]:border-transparent data-[shadow-overlay=true]:shadow-none md:pl-1 md:pr-0"
          >
            <div className="flex h-full min-h-0 w-full flex-col">
              <HomeProjectsSearch
                accountName={displayName}
                ownerKey={userId}
                projects={summaryProjects}
                sectionLabel="All projects"
                showAllProjects
                showOwnerFilter={false}
                initialViewMode={initialViewMode}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
