import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import {
  clearPrismaDatabaseUnavailable,
  isPrismaDatabaseCooldownActive,
  markPrismaDatabaseUnavailable,
  prisma,
} from "@/lib/prisma";
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

function extractRotationFromData(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const record = data as Record<string, unknown>;
  const pages = Array.isArray(record.pages) ? record.pages : null;
  if (!pages || pages.length === 0) return 0;
  const first = pages[0];
  if (!first || typeof first !== "object") return 0;
  return typeof (first as { rotation?: unknown }).rotation === "number"
    ? (first as { rotation: number }).rotation
    : 0;
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

  const summaryProjects = shapedProjects.map((project) => ({
    id: project.id,
    name: project.name ?? "Untitled project",
    updatedAt: project.updatedAt,
    pagesCount: project.pagesCount ?? 0,
    previewUrl: project.previewKey ? `/api/projects/${project.id}/thumbnail` : null,
    pdfUrl: null,
    hasPreview: !!project.previewKey,
    fileSizeBytes: extractFileSizeFromData(project.data),
    rotation: extractRotationFromData(project.data),
  }));

  return (
    <main
      className="box-border w-full bg-[#F1F4F9] pt-3 pb-0 md:pt-6 md:pb-0 dark:bg-[#252525]"
      style={{
        height:
          "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px) - var(--home-topbar-offset, 0px) - var(--workspace-content-bottom-subtract, var(--workspace-frame-gutter, 48px)))",
      }}
    >
      <div className="h-full min-h-0 w-full">
        <div className="projects-content-grid flex h-full w-full min-h-0 flex-col">
          <div
            id="home-projects-container"
            className="relative z-40 flex h-full min-h-0 w-full flex-col px-0 pt-0 data-[shadow-overlay=true]:border-transparent data-[shadow-overlay=true]:shadow-none md:pl-1 md:pr-0"
          >
            <div className="flex h-full min-h-0 w-full flex-col">
              <HomeProjectsSearch
                key={userId}
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

export default function AllProjectsPage() {
  return <AllProjectsContent />;
}
