"use client";

import { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";

type SummaryProject = {
  id: string;
  name: string;
  updatedAt: string | Date;
  previewUrl?: string | null;
};

function formatUpdatedLabel(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  initialProjects?: SummaryProject[];
};

export default function RecentProjectsRow({ initialProjects }: Props) {
  const [projects, setProjects] = useState<SummaryProject[]>(initialProjects ?? []);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialProjects && initialProjects.length) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/projects?summary=1", { cache: "force-cache" });
        if (!res.ok) return;
        const data = (await res.json()) as { projects?: SummaryProject[] };
        if (!data.projects || !Array.isArray(data.projects)) return;
        if (cancelled) return;
        setProjects(data.projects);
      } catch {
        // ignore
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!projects.length) {
    return null;
  }

  const displayProjects = projects.slice(0, 6);
  const mapped = displayProjects.map((project) => ({
    id: project.id,
    title: project.name?.trim() || "Untitled project",
    updated: `Edited ${formatUpdatedLabel(project.updatedAt)}`,
    previewUrl: project.previewUrl ?? null,
    pagesCount: 0,
  }));
  const hasSelection = Object.values(selected).some(Boolean);

  return (
    <div className="projects-grid mt-2 grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
      {mapped.map((project, index) => {
        const isSelected = !!selected[project.id];
        return (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={isSelected}
            hasSelection={hasSelection}
            onToggleSelected={(id) =>
              setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
            }
            imageLoading={index < 6 ? "eager" : "lazy"}
            imagePriority={index < 2}
          />
        );
      })}
    </div>
  );
}
