import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import { curatedProjects } from "@/lib/sampleProjects";
import AllProjectsGrid from "@/components/AllProjectsGrid";
import { formatProjectLastEdited } from "@/lib/formatProjectLastEdited";

export const dynamic = "force-dynamic";

export default async function StarredProjectsPage() {
  const session = await getServerSessionSafe();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.twoFactorEnabled && !session.user.twoFactorPassed) {
    redirect("/2fa");
  }

  let dbProjects:
    | {
        id: string;
        name: string | null;
        updatedAt: Date;
        data: unknown;
        pdfUrl: string | null;
        rotation?: number | null;
      }[]
    | null = null;

  try {
    dbProjects = await prisma.project.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, updatedAt: true, data: true, pdfUrl: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to load projects from database", error);
  }

  const projects =
    dbProjects && dbProjects.length > 0
      ? dbProjects.map((project) => {
          return {
            id: project.id,
            title: project.name?.trim() || "Untitled project",
            updated: formatProjectLastEdited(project.updatedAt),
            pdfUrl: project.pdfUrl,
            rotation: 0,
          };
        })
      : curatedProjects.map((project) => ({
          id: project.id,
          title: project.title,
          updated: project.updated,
          pdfUrl: null,
          rotation: 0,
        }));

  return (
    <div className="min-h-screen bg-[#F9FAFC] px-2 pb-0 pt-10 sm:px-4 sm:pt-12 lg:px-6 lg:pt-14">
      <div className="mx-auto w-full pb-16">
        <h1 className="mt-2 text-center text-4xl font-semibold text-slate-900 sm:mt-4 sm:text-5xl">
          Starred Projects
        </h1>
        <AllProjectsGrid projects={projects} />
      </div>
    </div>
  );
}
