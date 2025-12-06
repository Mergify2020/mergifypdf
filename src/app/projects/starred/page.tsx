import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { curatedProjects } from "@/lib/sampleProjects";
import AllProjectsGrid from "@/components/AllProjectsGrid";

function formatUpdatedLabel(date: Date) {
  const target = date;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  let dayLabel: string;
  if (target.toDateString() === today.toDateString()) {
    dayLabel = "Today";
  } else if (target.toDateString() === yesterday.toDateString()) {
    dayLabel = "Yesterday";
  } else {
    dayLabel = target.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  const timeLabel = target.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dayLabel} • ${timeLabel}`;
}

export default async function StarredProjectsPage() {
  const session = await getServerSession(authOptions);

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
      }[]
    | null = null;

  try {
    dbProjects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to load projects from database", error);
  }

  const projects =
    dbProjects && dbProjects.length > 0
      ? dbProjects.map((project) => {
          const data = project.data as
            | {
                firstPageThumb?: string | null;
                pages?: { id: string }[];
                pageThumbs?: string[];
              }
            | null;
          const preview =
            data && typeof data.firstPageThumb === "string" && data.firstPageThumb.length > 0
              ? data.firstPageThumb
              : undefined;
          const pagesCount = Array.isArray(data?.pages) ? data.pages.length : undefined;
          const pageThumbs =
            Array.isArray(data?.pageThumbs) && data.pageThumbs.length > 0
              ? data.pageThumbs.filter((thumb) => typeof thumb === "string" && thumb.length > 0)
              : undefined;
          return {
            id: project.id,
            title: project.name?.trim() || "Untitled project",
            updated: formatUpdatedLabel(project.updatedAt),
            preview,
            pagesCount,
            pageThumbs,
          };
        })
      : curatedProjects;

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

