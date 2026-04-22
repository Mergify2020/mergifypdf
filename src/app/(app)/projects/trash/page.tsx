import TrashProjectsList from "@/components/TrashProjectsList";
import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import { formatProjectLastEdited } from "@/lib/formatProjectLastEdited";
import { getR2Config, getR2ObjectSize } from "@/lib/r2";

export const dynamic = "force-dynamic";

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

export default async function TrashProjectsPage() {
  const session = await getServerSessionSafe();

  if (!session?.user) {
    redirect("/login");
  }

  const googleManagedAccount =
    !!session.user.providers?.includes("google") && !session.user.providers.includes("credentials");
  if (!googleManagedAccount && session.user.twoFactorEnabled && !session.user.twoFactorPassed) {
    redirect("/2fa");
  }

  const userId = session.user.id;
  if (!userId) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: { userId, trashedAt: { not: null } },
    orderBy: { trashedAt: "desc" },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      trashedAt: true,
      pdfKey: true,
      data: true,
      pagesCount: true,
    },
  });

  let r2Config: ReturnType<typeof getR2Config> | null = null;
  try {
    r2Config = getR2Config();
  } catch {
    r2Config = null;
  }

  const trashProjects = await Promise.all(
    projects.map(async (project) => {
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
        title: project.name?.trim() || "Untitled project",
        updatedLabel: formatProjectLastEdited(project.updatedAt),
        trashedAt: project.trashedAt?.toISOString() ?? new Date().toISOString(),
        fileSizeBytes,
        pagesCount: project.pagesCount ?? 0,
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
        <div className="flex h-full w-full min-h-0 flex-col md:pl-1 md:pr-0">
          <TrashProjectsList
            projects={trashProjects}
            accountName={session.user.name ?? "Account"}
            accountEmail={session.user.email ?? null}
          />
        </div>
      </div>
    </main>
  );
}
