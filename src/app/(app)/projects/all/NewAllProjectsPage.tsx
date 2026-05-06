"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatProjectLastEdited } from "@/lib/formatProjectLastEdited";
import HomePdfPreview from "@/components/HomePdfPreview";
import {
  beginExistingWorkspaceOpenHandoff,
  preloadExistingWorkspaceProject,
  shouldHandleWorkspaceOpenClick,
} from "@/lib/workspaceOpenHandoff";

type ApiProject = {
  id: string;
  name: string | null;
  updatedAt: string | number | Date;
  pdfUrl?: string | null;
  pagesCount?: number | null;
  rotation?: number | null;
};

type ProjectCard = {
  id: string;
  title: string;
  updatedLabel: string;
  pdfUrl: string | null;
  rotation?: number | null;
};

export default function NewAllProjectsPage() {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/projects?summary=1", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { projects?: ApiProject[] };
        if (!Array.isArray(data.projects) || cancelled) return;

        const mapped: ProjectCard[] = data.projects.map((project) => ({
          id: project.id,
          title: project.name?.trim() || "Untitled project",
          updatedLabel: formatProjectLastEdited(project.updatedAt),
          pdfUrl: project.pdfUrl ?? null,
          rotation: project.rotation ?? 0,
        }));

        if (!cancelled) {
          setProjects(mapped);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F1F4F9] px-3 pb-10 pt-10 text-slate-900 dark:bg-[#222224] dark:text-zinc-100 sm:px-4 sm:pt-12 lg:px-6 lg:pt-14">
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="mt-2 text-center text-3xl font-semibold text-slate-900 dark:text-zinc-100 sm:mt-4 sm:text-4xl">
          All Projects
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-zinc-400">
          Browse your recent work and jump back into any project.
        </p>

        {loading ? (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-6 lg:gap-8">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={`all-projects-loading-${index}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="aspect-[1.23/1] rounded-xl bg-slate-100 skeleton-shimmer dark:bg-zinc-800" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-3/4 rounded-full bg-slate-100 skeleton-shimmer dark:bg-zinc-800" />
                  <div className="h-3 w-1/2 rounded-full bg-slate-100 skeleton-shimmer dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center text-slate-500">
            <p className="text-base font-semibold text-slate-700">No projects yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Create a new project from the dashboard to see it here.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-6 lg:gap-8">
            {projects.map((project) => (
              <ProjectCardView key={project.id} project={project} router={router} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCardView({
  project,
  router,
}: {
  project: ProjectCard;
  router: ReturnType<typeof useRouter>;
}) {
  const pdfUrl = project.pdfUrl ?? null;
  const rotation = project.rotation ?? 0;
  const openProject = async () => {
    beginExistingWorkspaceOpenHandoff(project.id);
    await preloadExistingWorkspaceProject(project.id);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        router.push(`/studio?project=${encodeURIComponent(project.id)}`);
      });
    });
  };

  return (
    <a
      href={`/studio?project=${encodeURIComponent(project.id)}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
      aria-label={project.title}
      onClick={(event) => {
        if (!shouldHandleWorkspaceOpenClick(event)) return;
        event.preventDefault();
        openProject();
      }}
    >
      <div className="relative aspect-[1.23/1] bg-[#EEF1F5] dark:bg-[#222224]">
        <HomePdfPreview pdfUrl={pdfUrl} rotation={rotation} />
      </div>
      <div className="mt-4 space-y-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">{project.title}</p>
        <p className="text-xs text-slate-500 dark:text-zinc-400">{project.updatedLabel}</p>
      </div>
    </a>
  );
}
