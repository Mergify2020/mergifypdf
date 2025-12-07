"use client";

import { useEffect, useState } from "react";
import AllProjectsGrid from "@/components/AllProjectsGrid";
import LogoMerge from "@/components/LogoMerge";

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

export default function AllProjectsClient() {
  const [projects, setProjects] = useState<ProjectCard[]>(() => cachedProjects ?? []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (cachedProjects && cachedProjects.length > 0) {
      // Already have projects cached for this session; no need to refetch
      // just for navigation between tabs/routes.
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/projects?summary=1", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { projects?: ApiProject[] };
        if (!Array.isArray(data.projects) || cancelled) return;

        const mapped = data.projects.map((project) => {
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

        if (!cancelled) {
          cachedProjects = mapped;
          setProjects(mapped);
        }
      } catch {
        // On error, leave projects as-is; page can show an empty state.
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return projects.length === 0 ? (
    <div className="flex min-h-[320px] items-center justify-center">
      <LogoMerge size={72} />
    </div>
  ) : (
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
