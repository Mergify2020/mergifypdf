"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { sanitizeProjectName } from "@/lib/projectName";
import { loadRecentProjects, type RecentProjectEntry } from "@/lib/recentProjects";

type ProjectItem = {
  id: string;
  title: string;
  updated: string;
  updatedAt?: number;
  thumbnailUrl?: string | null;
  pdfKey?: string;
  isLocal?: boolean;
};

type Props = {
  initialProjects?: ProjectItem[];
};

function formatUpdatedLabel(timestamp?: number) {
  if (!timestamp) return "moments ago";
  const target = new Date(timestamp);
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

function mapApiProject(project: any): ProjectItem {
  const updatedAt = project?.updatedAt ? new Date(project.updatedAt).getTime() : Date.now();
  return {
    id: project?.id ?? crypto.randomUUID(),
    title: project?.name ?? "Untitled project",
    updatedAt,
    updated: formatUpdatedLabel(updatedAt),
    thumbnailUrl: project?.thumbnailUrl ?? null,
    pdfKey: project?.pdfKey,
    isLocal: false,
  };
}

function mapRecentProject(project: RecentProjectEntry): ProjectItem {
  const updatedAt = project.updatedAt || Date.now();
  return {
    id: project.id,
    title: project.title,
    updatedAt,
    updated: formatUpdatedLabel(updatedAt),
    thumbnailUrl: null,
    isLocal: true,
  };
}

export default function ProjectsList({ initialProjects = [] }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const ownerId = session?.user?.id ?? null;

    const localProjects = loadRecentProjects(ownerId).map(mapRecentProject);
    if (localProjects.length > 0) {
      setProjects(localProjects);
      setLoading(false);
    } else if (initialProjects.length > 0) {
      setProjects(initialProjects);
      setLoading(false);
    }

    async function fetchProjects() {
      try {
        if (!localProjects.length) {
          setLoading(true);
        }
        const res = await fetch("/api/projects", { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 401) {
            setProjects(localProjects.length > 0 ? localProjects : initialProjects);
            return;
          }
          throw new Error("Failed to fetch projects");
        }
        const data = await res.json();
        const mapped = Array.isArray(data?.projects) ? data.projects.map(mapApiProject) : [];
        if (!cancelled) {
          setProjects(mapped.length > 0 ? mapped : localProjects);
        }
      } catch (err) {
        console.error("Failed to load projects", err);
        if (!cancelled) setProjects(localProjects);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProjects();
    return () => {
      cancelled = true;
    };
  }, [initialProjects, session?.user?.id]);

  function openRename(project: ProjectItem) {
    setRenaming({ id: project.id, value: project.title });
    setError(null);
  }

  function closeRename() {
    setRenaming(null);
    setError(null);
  }

  function handleRenameSave() {
    if (!renaming) return;
    const clean = sanitizeProjectName(renaming.value);
    if (!clean) {
      setError("Please enter a name.");
      return;
    }
    const renameId = renaming.id;
    setProjects((prev) => {
      const next = prev.map((project) => {
        if (project.id !== renameId) return project;
        const updatedAt = Date.now();
        return {
          ...project,
          title: clean,
          updatedAt,
          updated: formatUpdatedLabel(updatedAt),
        };
      });
      return next;
    });
    closeRename();
  }

  const visibleProjects = showAll ? projects : projects.slice(0, 5);

  function toggleSelectMode() {
    setSelectionMode((prev) => {
      if (prev) setSelected(new Set());
      return !prev;
    });
  }

  function toggleSelectProject(projectId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return;
    setProjects((prev) => {
      const next = prev.filter((project) => !selected.has(project.id));
      return next;
    });
    setSelected(new Set());
    setSelectionMode(false);
  }

  const getOpenHref = (project: ProjectItem) => (project.isLocal ? "/studio" : `/studio/${project.id}`);

  return (
    <>
      <div className="rounded-[36px] border border-white/60 bg-white/95 p-8 shadow-[0_40px_120px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-slate-900">Your projects</h2>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={toggleSelectMode}
              className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              {selectionMode ? "Cancel" : "Select"}
            </button>
            {selectionMode && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selected.size === 0}
                className="rounded-full border border-rose-200 px-4 py-2 font-semibold text-rose-600 transition hover:border-rose-400 hover:text-rose-700 disabled:border-slate-200 disabled:text-slate-400"
              >
                Delete
              </button>
            )}
            <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold text-slate-600 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded-full px-3 py-1 transition ${viewMode === "list" ? "bg-white text-slate-900 shadow" : "hover:text-slate-900"}`}
              >
                List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-full px-3 py-1 transition ${viewMode === "grid" ? "bg-white text-slate-900 shadow" : "hover:text-slate-900"}`}
              >
                Grid View
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              {showAll ? "Collapse" : "View all"}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-500">{error}</p> : null}
        <div
          className={`mt-5 overflow-hidden transition-[max-height] duration-500 ${
            showAll ? "max-h-[2400px]" : "max-h-[520px]"
          }`}
        >
          {viewMode === "list" ? (
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="py-6 text-sm text-slate-500">Loading projects…</div>
              ) : visibleProjects.length === 0 ? (
                <div className="py-6 text-sm text-slate-500">No projects yet.</div>
              ) : (
                visibleProjects.map((project) => {
                  const isSelected = selected.has(project.id);
                  return (
                    <div
                      key={project.id}
                      className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {selectionMode ? (
                          <button
                            type="button"
                            onClick={() => toggleSelectProject(project.id)}
                            className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                              isSelected ? "border-[#024d7c] bg-[#024d7c]" : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected ? <Check className="h-4 w-4 text-white" /> : null}
                          </button>
                        ) : null}
                        <p className="text-lg font-semibold text-slate-900">{project.title}</p>
                        <button
                          type="button"
                          onClick={() => openRename(project)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                            <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path
                              d="M16.5 3.5a2.121 2.121 0 013 3L7 19.5 3 21l1.5-4L16.5 3.5z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Edit
                        </button>
                        <p className="text-sm text-slate-500">Last edited {project.updated}</p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                          disabled={project.isLocal}
                        >
                          Download
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12 5v10m0 0l-4-4m4 4l4-4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path d="M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                        <Link
                          href={getOpenHref(project)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#024d7c] px-3 py-1 text-white transition hover:bg-[#013a60]"
                        >
                          Open
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <div className="col-span-full py-6 text-sm text-slate-500">Loading projects…</div>
              ) : visibleProjects.length === 0 ? (
                <div className="col-span-full py-6 text-sm text-slate-500">No projects yet.</div>
              ) : (
                visibleProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group relative cursor-pointer rounded-xl border border-slate-200/70 bg-white p-4 pb-14 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70"
                    onClick={() => router.push(getOpenHref(project))}
                  >
                    {project.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.thumbnailUrl}
                        alt={`${project.title} thumbnail`}
                        className="mb-3 h-24 w-full rounded-lg border border-slate-100 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="mb-3 h-24 rounded-lg border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100" />
                    )}
                    <p className="text-base font-semibold text-slate-900">{project.title}</p>
                    <p className="mt-1 text-sm text-slate-500">Last edited {project.updated}</p>
                    <div className="pointer-events-none absolute inset-x-4 bottom-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(getOpenHref(project));
                        }}
                        className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-[#024d7c] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[#013a60]"
                      >
                        Open
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => event.stopPropagation()}
                        className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openRename(project);
                        }}
                        className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {renaming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeRename} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-[0_35px_70px_rgba(15,23,42,0.35)]">
            <h2 className="text-2xl font-semibold">Reset name to save</h2>
            <p className="mt-1 text-sm text-slate-500">Update the project name below.</p>
            <input
              type="text"
              value={renaming.value}
              onChange={(event) => {
                setRenaming((current) => (current ? { ...current, value: event.target.value } : current));
                if (error) setError(null);
              }}
              className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-400"
            />
            {error ? <p className="mt-2 text-sm text-rose-500">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-3 text-sm">
              <button
                type="button"
                onClick={closeRename}
                className="rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameSave}
                className="rounded-full bg-[#024d7c] px-5 py-2 font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:-translate-y-0.5"
              >
                Save name
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
