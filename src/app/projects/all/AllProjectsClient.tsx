"use client";

import { useEffect, useState } from "react";
import AllProjectsGrid from "@/components/AllProjectsGrid";
import LogoMerge from "@/components/LogoMerge";

type ApiProject = {
  id: string;
  name: string | null;
  updatedAt: string | number | Date;
  data: unknown;
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
  preview?: string | null;
  pagesCount?: number;
  pageThumbs?: string[];
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
        const res = await fetch("/api/projects", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { projects?: ApiProject[] };
        if (!Array.isArray(data.projects) || cancelled) return;

        const mapped = data.projects.map((project) => {
          const updatedAt =
            project.updatedAt instanceof Date ? project.updatedAt : new Date(project.updatedAt);

          const payload = project.data as
            | {
                firstPageThumb?: string | null;
                pages?: { id: string }[];
                pageThumbs?: string[];
              }
            | null;

          const preview =
            payload && typeof payload.firstPageThumb === "string" && payload.firstPageThumb.length > 0
              ? payload.firstPageThumb
              : undefined;
          const pagesCount = Array.isArray(payload?.pages) ? payload.pages.length : undefined;
          const pageThumbs =
            Array.isArray(payload?.pageThumbs) && payload.pageThumbs.length > 0
              ? payload.pageThumbs.filter((thumb) => typeof thumb === "string" && thumb.length > 0)
              : undefined;

          return {
            id: project.id,
            title: project.name?.trim() || "Untitled project",
            updated: formatUpdatedLabel(updatedAt),
            preview,
            pagesCount,
            pageThumbs,
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
    <AllProjectsGrid projects={projects} />
  );
}
