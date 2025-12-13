"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import AllProjectsGrid from "@/components/AllProjectsGrid";
import { getProjectsSummaryCache, type ProjectsSummaryProject } from "@/lib/projectsSummaryCache";

type ApiProject = {
  id: string;
  name: string | null;
  updatedAt: string | number | Date;
  previewUrl?: string | null;
  pagesCount?: number | null;
};

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

type ProjectCard = {
  id: string;
  title: string;
  updated: string;
  previewUrl?: string | null;
  pagesCount?: number;
};

let cachedProjects: ProjectCard[] | null = null;

function mapSummaryProjects(projects: ProjectsSummaryProject[]): ProjectCard[] {
  return projects.map((project) => {
    const updatedAt =
      project.updatedAt instanceof Date ? project.updatedAt : new Date(project.updatedAt);

    return {
      id: project.id,
      title: project.name?.trim() || "Untitled project",
      updated: formatUpdatedLabel(updatedAt),
      previewUrl: project.previewUrl ?? null,
      pagesCount: project.pagesCount ?? 0,
    };
  });
}

export default function AllProjectsClient() {
  const cachedSummary = getProjectsSummaryCache();
  const initialProjects = cachedProjects ?? (cachedSummary ? mapSummaryProjects(cachedSummary) : []);
  if (!cachedProjects && cachedSummary) {
    cachedProjects = initialProjects;
  }

  const [projects, setProjects] = useState<ProjectCard[]>(initialProjects);
  const [loading, setLoading] = useState(() => initialProjects.length === 0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (cachedProjects && cachedProjects.length > 0) return;

    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/projects?summary=1", { cache: "force-cache" });
        if (!res.ok) return;
        const data = (await res.json()) as { projects?: ApiProject[] };
        if (!Array.isArray(data.projects) || cancelled) return;

        const mapped = mapSummaryProjects(data.projects as ProjectsSummaryProject[]);

        if (!cancelled) {
          cachedProjects = mapped;
          setProjects(mapped);
          setLoading(false);
        }
      } catch {
        // On error, leave projects as-is; page can show an empty state.
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFC] px-2 pb-0 pt-10 sm:px-4 sm:pt-12 lg:px-6 lg:pt-14">
        <div className="mx-auto w-full pb-16">
          <h1 className="mt-2 text-center text-4xl font-semibold text-slate-900 sm:mt-4 sm:text-5xl">
            All Projects
          </h1>
          <div className="projects-grid mt-10 grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 sm:gap-8 lg:gap-10">
            {Array.from({ length: 18 }).map((_, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className="rounded-[10px] bg-white/60 p-3 shadow-sm ring-1 ring-slate-200/60"
              >
                <div className="relative m-[3px] w-[calc(100%-6px)] aspect-[1.23/1] overflow-hidden rounded-[10px] bg-[#EEF1F5] border border-[rgba(0,0,0,0.06)]">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-4 w-3/4 rounded-full skeleton-shimmer" />
                  <div className="h-3.5 w-1/2 rounded-full skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!loading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-[#F9FAFC] px-2 pb-0 pt-10 sm:px-4 sm:pt-12 lg:px-6 lg:pt-14">
        <div className="mx-auto w-full pb-16">
          <h1 className="mt-2 text-center text-4xl font-semibold text-slate-900 sm:mt-4 sm:text-5xl">
            All Projects
          </h1>
          <div className="mt-16 flex min-h-[40vh] flex-col items-center justify-center text-center">
          <p className="mt-3 max-w-md text-sm text-slate-500 sm:text-base">
            You don&apos;t have any projects yet. Start a new workspace to upload and merge your PDFs.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                (window as any).dispatchEvent(new Event("open-create-project"));
              }
            }}
            className="mt-8 inline-flex flex-col items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-10 py-4 text-lg font-semibold text-white shadow-lg transition hover:shadow-xl sm:px-12 sm:py-5 sm:text-xl"
          >
            <span>Start a New Project</span>
            <span className="mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <Plus className="h-5 w-5" aria-hidden />
            </span>
          </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFC] px-2 pb-0 pt-10 sm:px-4 sm:pt-12 lg:px-6 lg:pt-14">
      <div className="mx-auto w-full pb-16">
        <h1 className="mt-2 text-center text-4xl font-semibold text-slate-900 sm:mt-4 sm:text-5xl">
          All Projects
        </h1>
        <AllProjectsGrid
          projects={projects}
          onProjectTrashed={(id) => {
            setProjects((prev) => prev.filter((project) => project.id !== id));
            if (cachedProjects) {
              cachedProjects = cachedProjects.filter((project) => project.id !== id);
            }
          }}
        />
      </div>
    </div>
  );
}
