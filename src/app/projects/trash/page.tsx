"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AllProjectsGrid from "@/components/AllProjectsGrid";
import { formatProjectLastEdited } from "@/lib/formatProjectLastEdited";

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
  updated: string;
  previewUrl?: string | null;
  pagesCount?: number;
};

export default function TrashProjectsPage() {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/projects?summary=1&trashed=1", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { projects?: ApiProject[] };
        if (!Array.isArray(data.projects) || cancelled) return;

        const mapped: ProjectCard[] = data.projects.map((project) => ({
          id: project.id,
          title: project.name?.trim() || "Untitled project",
          updated: formatProjectLastEdited(project.updatedAt),
          previewUrl: project.previewUrl ?? null,
          pagesCount: project.pagesCount ?? 0,
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
    <div className="min-h-screen bg-[#F9FAFC] px-2 pb-10 pt-10 sm:px-4 sm:pt-12 lg:px-6 lg:pt-14">
      <div className="mx-auto w-full pb-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Trash</h1>
            <p className="mt-2 text-sm text-slate-500">
              Projects you move here will appear in this space. Items may be permanently removed
              after a period of time.
            </p>
          </div>
          <Link
            href="/projects/all"
            className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:inline-flex"
          >
            Back to all projects
          </Link>
        </div>

        {loading ? (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-6 lg:gap-8">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={`trash-loading-${index}`}
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
          <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center text-sm text-slate-500">
            Trash is currently empty.
          </div>
        ) : (
          <AllProjectsGrid projects={projects} />
        )}
      </div>
    </div>
  );
}
