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

export default async function AllProjectsPage() {
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
      className="box-border w-full bg-[#F1F4F9] pt-3 pb-0 md:pt-6 md:pb-0 transition-[height] duration-300 ease-out dark:bg-[#222224]"
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
