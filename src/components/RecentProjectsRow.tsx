"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (initialProjects && initialProjects.length) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/projects?summary=1", { cache: "no-store" });
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

  return (
    <div className="flex flex-wrap justify-start gap-6">
      {displayProjects.map((project) => (
        <Link
          key={project.id}
          href={`/studio?project=${encodeURIComponent(project.id)}`}
          className="group flex w-full min-w-[260px] max-w-full flex-1 flex-col rounded-[16px] border border-[#e1e7f0] bg-white/90 p-4 text-left text-slate-900 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition hover:-translate-y-1 hover:border-[#cfd8e6] hover:bg-white hover:shadow-[0_8px_30px_rgba(15,23,42,0.12)] sm:min-w-[280px] lg:min-w-[300px] lg:max-w-[320px]"
        >
          <div className="relative w-full overflow-hidden rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-[#EEF1F5]">
            <div className="relative h-40 w-full p-3">
              {project.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.previewUrl}
                  alt={project.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-slate-500 transition-colors duration-150 group-hover:text-slate-600">
                  {(project.name || "Untitled project").charAt(0)}
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 line-clamp-1 text-base font-semibold text-slate-900">
            {project.name || "Untitled project"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Edited {formatUpdatedLabel(project.updatedAt)}
          </p>
        </Link>
      ))}
    </div>
  );
}
