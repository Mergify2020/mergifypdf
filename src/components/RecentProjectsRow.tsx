"use client";

import { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";
import { matchesSearch } from "@/lib/search";
import { formatProjectLastEdited } from "@/lib/formatProjectLastEdited";

type SummaryProject = {
  id: string;
  name: string;
  updatedAt: string | Date;
  pdfUrl?: string | null;
  pagesCount?: number | null;
  rotation?: number | null;
  hasPreview?: boolean;
};

type Props = {
  initialProjects?: SummaryProject[];
  query?: string;
  ownerFilter?: "any" | "shared" | "you";
  sortOption?: "activity" | "az" | "za";
  showAllProjects?: boolean;
  showResumeBadge?: boolean;
};

export default function RecentProjectsRow({
  initialProjects,
  query = "",
  ownerFilter = "any",
  sortOption = "activity",
  showAllProjects = false,
  showResumeBadge = false,
}: Props) {
  const [projects, setProjects] = useState<SummaryProject[]>(initialProjects ?? []);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const loading = false;

  useEffect(() => {
    setProjects(initialProjects ?? []);
  }, [initialProjects]);

  if (!projects.length && !loading) {
    return (
      <div className="mt-6 flex min-h-[260px] w-full flex-col items-center justify-center rounded-[24px] border-[3px] border-dashed border-[#51bdff] bg-white/70 px-8 py-12 text-center shadow-sm dark:shadow-[0_8px_20px_rgba(0,0,0,0.3)] dark:border-zinc-700 dark:bg-zinc-900/60">
        <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100 sm:text-xl">No projects yet</p>
        <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-zinc-400 sm:text-base">Start a new project to see it here.</p>
      </div>
    );
  }

  if (loading && !projects.length) {
    return (
      <div className="projects-grid mt-2 grid w-full max-w-[1296px] justify-start gap-6 grid-cols-[repeat(auto-fit,minmax(var(--projects-grid-min,240px),1fr))]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`home-loading-project-${index}`} className="flex flex-col text-left">
            <div className="relative rounded-[10px] bg-[#F9FAFC] dark:bg-zinc-900/60">
              <div className="relative m-[3px] aspect-square w-[calc(100%-6px)] overflow-hidden rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-[#EEF1F5] dark:border-zinc-800 dark:bg-zinc-800/70">
                <div className="absolute inset-0 rounded-[10px] skeleton-shimmer opacity-90" />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <div className="h-7 w-2/3 rounded-full bg-slate-100 dark:bg-zinc-800/70" />
              <div className="h-5 w-1/2 rounded-full bg-slate-100 dark:bg-zinc-800/70" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const trimmed = query.trim();
  const visibleProjects =
    ownerFilter === "shared" ? [] : projects;
  const filteredProjects = trimmed
    ? visibleProjects.filter((project) => matchesSearch(project.name?.trim() || "Untitled project", trimmed))
    : visibleProjects;
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortOption === "activity") {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    const aName = (a.name ?? "").trim().toLowerCase();
    const bName = (b.name ?? "").trim().toLowerCase();
    const cmp = aName.localeCompare(bName);
    return sortOption === "az" ? cmp : -cmp;
  });
  const displayProjects = showAllProjects ? sortedProjects : sortedProjects.slice(0, trimmed ? 24 : 9);
  const mapped = displayProjects.map((project) => ({
    id: project.id,
    title: project.name?.trim() || "Untitled project",
    updated: formatProjectLastEdited(project.updatedAt),
    pdfUrl: project.pdfUrl ?? null,
    pagesCount: project.pagesCount ?? 0,
    rotation: project.rotation ?? 0,
    hasPreview: project.hasPreview ?? false,
  }));
  const hasSelection = Object.values(selected).some(Boolean);

  if (trimmed && mapped.length === 0) {
    return (
      <div className="relative">
        <div
          aria-hidden="true"
          className="projects-grid mt-2 grid w-full max-w-[1296px] justify-start gap-6 grid-cols-[repeat(auto-fit,minmax(var(--projects-grid-min,240px),1fr))]"
        >
          {Array.from({ length: 6 }).map((_, index) => (
          <div key={`home-empty-project-${index}`} className="invisible flex flex-col text-left">
            <div className="relative rounded-[10px] bg-[#F9FAFC] dark:bg-zinc-900/60">
              <div className="relative m-[3px] aspect-square w-[calc(100%-6px)] overflow-hidden rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-[#EEF1F5] dark:border-zinc-800 dark:bg-zinc-800/70" />
            </div>
              <div className="mt-2 space-y-0.5">
                <div className="h-7 w-2/3 rounded-full bg-slate-100 dark:bg-zinc-800/70" />
                <div className="h-5 w-1/2 rounded-full bg-slate-100 dark:bg-zinc-800/70" />
              </div>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-10">
          <p className="rounded-full bg-white/85 px-5 py-2 text-sm font-semibold text-slate-500 shadow-sm dark:shadow-none backdrop-blur dark:bg-zinc-900/80 dark:text-zinc-300 sm:text-base">
            No projects match &quot;{trimmed}&quot;.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-grid mt-2 grid w-full max-w-[1296px] justify-start gap-6 grid-cols-[repeat(auto-fit,minmax(var(--projects-grid-min,240px),1fr))]">
      {mapped.map((project, index) => {
        const isSelected = !!selected[project.id];
        return (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={isSelected}
            hasSelection={hasSelection}
            showResumeBadge={showResumeBadge && sortOption === "activity" && index === 0}
            onToggleSelected={(id) =>
              setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
            }
            onRenamed={(id, title) => {
              setProjects((prev) =>
                prev.map((entry) => (entry.id === id ? { ...entry, name: title } : entry))
              );
            }}
            onCopied={(duplicated, sourceId) => {
              const nextId = duplicated.id;
              const nextName = duplicated.name?.trim() || "Untitled project";
              const updatedAtValue = duplicated.updatedAt ?? new Date();
              const nextUpdatedAt =
                updatedAtValue instanceof Date ? updatedAtValue : new Date(updatedAtValue);
              setProjects((prev) => {
                const nextEntry: SummaryProject = {
                  id: nextId,
                  name: nextName,
                  updatedAt: nextUpdatedAt,
                  pdfUrl: duplicated.pdfUrl ?? null,
                  pagesCount: duplicated.pagesCount ?? 0,
                  rotation: 0,
                };
                const withoutNew = prev.filter((entry) => entry.id !== nextId);
                const sourceIndex = withoutNew.findIndex((entry) => entry.id === sourceId);
                if (sourceIndex === -1) return [nextEntry, ...withoutNew];
                const next = [...withoutNew];
                next.splice(sourceIndex + 1, 0, nextEntry);
                return next;
              });
            }}
          />
        );
      })}
    </div>
  );
}
