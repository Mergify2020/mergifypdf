import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import AllProjectsGrid from "@/components/AllProjectsGrid";
import { formatProjectLastEdited } from "@/lib/formatProjectLastEdited";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StarredProjectsPage() {
  const session = await getServerSessionSafe();

  if (!session?.user) {
    redirect("/login");
  }

  const googleManagedAccount =
    !!session.user.providers?.includes("google") && !session.user.providers.includes("credentials");
  if (!googleManagedAccount && session.user.twoFactorEnabled && !session.user.twoFactorPassed) {
    redirect("/2fa");
  }

  let dbProjects:
    | {
        id: string;
        name: string | null;
        updatedAt: Date;
        data: unknown;
        pdfKey: string | null;
        rotation?: number | null;
      }[]
    | null = null;

  try {
    dbProjects = await prisma.project.findMany({
      where: { userId: session.user.id, trashedAt: null },
      select: { id: true, name: true, updatedAt: true, data: true, pdfKey: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to load projects from database", error);
  }

  const projects =
    dbProjects?.map((project) => {
      return {
        id: project.id,
        title: project.name?.trim() || "Untitled project",
        updated: formatProjectLastEdited(project.updatedAt),
        pdfUrl: project.pdfKey ? `/api/projects/${project.id}/pdf` : null,
        rotation: 0,
      };
    }) ?? [];

  return (
    <div className="min-h-screen bg-[#F9FAFC] px-2 pb-0 pt-10 sm:px-4 sm:pt-12 lg:px-6 lg:pt-14">
      <div className="mx-auto w-full pb-16">
        <h1 className="mt-2 text-center text-4xl font-semibold text-slate-900 sm:mt-4 sm:text-5xl">
          Starred Projects
        </h1>
        {projects.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center text-sm text-slate-500">
            No starred projects yet.
          </div>
        ) : (
          <AllProjectsGrid projects={projects} />
        )}
      </div>
    </div>
  );
}
