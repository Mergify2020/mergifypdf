"use client";

import { useEffect, useState } from "react";

type ApiProject = {
  id: string;
  name: string | null;
  updatedAt: string | number | Date;
  previewUrl?: string | null;
  pagesCount?: number | null;
};

type ProjectCard = {
  id: string;
  title: string;
  updatedLabel: string;
  previewUrl: string | null;
};

function formatUpdatedLabel(value: string | number | Date): string {
  const target = value instanceof Date ? value : new Date(value);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  let dayLabel: string;
  if (target.toDateString() === today) {
    dayLabel = "Today";
  } else if (target.toDateString() === yesterday.toDateString()) {
    dayLabel = "Yesterday";
  } else {
    dayLabel = target.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const timeLabel = target.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `Edited ${dayLabel} • ${timeLabel}`;
}

export default function NewAllProjectsPage() {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);

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
          updatedLabel: formatUpdatedLabel(project.updatedAt),
          previewUrl: project.previewUrl ?? null,
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
    <div className="min-h-screen bg-[#F9FAFC] px-3 pb-10 pt-10 sm:px-4 sm:pt-12 lg:px-6 lg:pt-14">
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="mt-2 text-center text-3xl font-semibold text-slate-900 sm:mt-4 sm:text-4xl">
          All Projects
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Browse your recent work and jump back into any project.
        </p>

        {loading ? (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-6 lg:gap-8">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-3"
              >
                <div className="aspect-[1.23/1] rounded-xl bg-slate-100" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-3/4 rounded-full bg-slate-100" />
                  <div className="h-3 w-1/2 rounded-full bg-slate-100" />
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
              <ProjectCardView key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCardView({ project }: { project: ProjectCard }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const hasPreview = typeof project.previewUrl === "string" && project.previewUrl.length > 0;

  return (
    <a
      href={`/studio?project=${encodeURIComponent(project.id)}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative aspect-[1.23/1] overflow-hidden rounded-xl bg-[#EEF1F5]">
        {hasPreview ? (
          <>
            {!imageLoaded ? (
              <div className="absolute inset-0 animate-pulse rounded-xl bg-slate-100" />
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.previewUrl!}
              alt={project.title}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              className={`h-full w-full object-contain transition-opacity duration-200 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-slate-500">
            {project.title.charAt(0)}
          </div>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <p className="truncate text-sm font-semibold text-slate-900">{project.title}</p>
        <p className="text-xs text-slate-500">{project.updatedLabel}</p>
      </div>
    </a>
  );
}

