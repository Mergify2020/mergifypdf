import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { curatedProjects } from "@/lib/sampleProjects";

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

export default async function AllProjectsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.twoFactorEnabled && !session.user.twoFactorPassed) {
    redirect("/2fa");
  }

  const dbProjects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  const projects =
    dbProjects.length > 0
      ? dbProjects.map((project) => {
          const data = project.data as unknown as { firstPageThumb?: string | null } | null;
          const preview =
            data && typeof data.firstPageThumb === "string" && data.firstPageThumb.length > 0
              ? data.firstPageThumb
              : undefined;
          return {
            id: project.id,
            title: project.name?.trim() || "Untitled project",
            updated: formatUpdatedLabel(project.updatedAt),
            preview,
          };
        })
      : curatedProjects;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F6F7FC] via-white to-[#ECF3FF] px-0 pb-0 pt-6 sm:px-0 lg:px-4">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] w-full">
        <div className="flex-1 rounded-t-[48px] border border-white/70 bg-gradient-to-b from-white via-white/95 to-[#f3f7ff] p-1 pb-0 shadow-[0_40px_140px_rgba(80,100,150,0.25)]">
          <div className="rounded-t-[42px] bg-white/95 px-10 pb-20 pt-14 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] sm:px-16">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              Projects Overview
            </p>
            <h1 className="mt-5 text-center text-3xl font-semibold text-slate-900 sm:text-4xl">All Projects</h1>
            <p className="mx-auto mt-4 max-w-3xl text-center text-lg text-slate-600">
              This canvas will span every project in your workspace with filtering, sorting, and summary cards.
              For now it&apos;s a placeholder while we wire up the new experience.
            </p>
            <div className="mt-10 grid gap-10 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] 2xl:grid-cols-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/studio?project=${encodeURIComponent(project.id)}`}
                  className="flex flex-col text-left transition hover:-translate-y-1"
                >
                  <div className="rounded-[32px] bg-gradient-to-b from-white via-white to-slate-100 p-1 shadow-[0_25px_60px_rgba(15,23,42,0.15)]">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-slate-100">
                      {project.preview ? (
                        <Image
                          src={project.preview}
                          alt={project.title}
                          fill
                          className="object-contain object-center"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl font-semibold text-slate-500">
                          {project.title.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-0.5">
                    <p className="text-lg font-semibold text-slate-900">{project.title}</p>
                    <p className="text-sm text-slate-500">Edited {project.updated}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
