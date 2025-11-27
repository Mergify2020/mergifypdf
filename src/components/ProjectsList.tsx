"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { sanitizeProjectName } from "@/lib/projectName";
import {
  RECENT_PROJECTS_EVENT,
  RecentProjectEntry,
  loadRecentProjects,
  saveRecentProjects,
} from "@/lib/recentProjects";

type ProjectItem = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  updated: string;
  updatedAt?: number;
  persisted?: boolean;
};

type Props = {
  initialProjects: ProjectItem[];
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

function convertStoredEntry(entry: RecentProjectEntry): ProjectItem {
  return {
    id: entry.id,
    title: entry.title,
    subtitle: "Workspace project",
    status: "In progress",
    updatedAt: entry.updatedAt,
    updated: formatUpdatedLabel(entry.updatedAt),
    persisted: true,
  };
}

export default function ProjectsList({ initialProjects }: Props) {
  const { data: session } = useSession();
  const ownerId = useMemo(
    () => session?.user?.id ?? session?.user?.email ?? null,
    [session?.user?.id, session?.user?.email]
  );
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [storageReady, setStorageReady] = useState(false);

  const baseProjects = useMemo(() => initialProjects.filter((project) => !project.persisted), [initialProjects]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromStorage = () => {
      const stored = loadRecentProjects(ownerId)
        .slice()
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
        .map(convertStoredEntry);
      setProjects((prev) => {
        const nonPersisted = prev.filter((project) => !project.persisted);
        const fallback = nonPersisted.length ? nonPersisted : baseProjects;
        return [...stored, ...fallback];
      });
      setStorageReady(true);
    };
    syncFromStorage();
    // Also hydrate from the account-level API when signed in so projects follow the user.
    const hydrateFromApi = async () => {
      if (!ownerId) return;
      // First try the recent-projects bridge (Redis)
      try {
        const res = await fetch("/api/recent-projects", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { projects?: RecentProjectEntry[] };
        if (!Array.isArray(data.projects)) return;
        const local = loadRecentProjects(ownerId);
        if (data.projects.length === 0 && local.length > 0) {
          // No server-side projects yet — promote local ones so they follow the account.
          saveRecentProjects(ownerId, local);
        } else if (data.projects.length > 0) {
          // Server has the source of truth — sync it down.
          saveRecentProjects(ownerId, data.projects);
          return;
        }
      } catch {
        // ignore and fall through to the Prisma-backed projects API
      }
      // If Redis is empty or unavailable, fall back to the primary Project table
      try {
        const res = await fetch("/api/projects", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          projects?: { id: string; name?: string | null; updatedAt?: string | number | null }[];
        };
        if (!Array.isArray(data.projects)) return;
        const mapped: RecentProjectEntry[] = data.projects.map((project) => ({
          id: project.id,
          title: project.name?.trim() || "Untitled project",
          updatedAt: project.updatedAt ? new Date(project.updatedAt).getTime() : Date.now(),
        }));
        if (mapped.length > 0) {
          saveRecentProjects(ownerId, mapped);
        }
      } catch {
        // final fallback is whatever is already in local storage
      }
    };
    void hydrateFromApi();
    const eventKey = `${RECENT_PROJECTS_EVENT}:${ownerId ?? "anon"}`;
    window.addEventListener(eventKey, syncFromStorage);
    return () => window.removeEventListener(eventKey, syncFromStorage);
  }, [baseProjects, ownerId]);

  function openRename(project: ProjectItem) {
    setRenaming({ id: project.id, value: project.title });
    setError(null);
  }

  function closeRename() {
    setRenaming(null);
    setError(null);
  }

  function persistStoredProjects(nextProjects: ProjectItem[]) {
    if (!storageReady || !ownerId) return;
    const payload = nextProjects
      .filter((project) => project.persisted)
      .map<RecentProjectEntry>((project) => ({
        id: project.id,
        title: project.title,
        updatedAt: project.updatedAt ?? Date.now(),
      }));
    saveRecentProjects(ownerId, payload);
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
        if (project.persisted) {
          const updatedAt = Date.now();
          return {
            ...project,
            title: clean,
            updatedAt,
            updated: formatUpdatedLabel(updatedAt),
          };
        }
        return { ...project, title: clean };
      });
      persistStoredProjects(next);
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
      persistStoredProjects(next);
      return next;
    });
    setSelected(new Set());
    setSelectionMode(false);
  }

  return (
    <>
      <div className="rounded-[14px] border border-slate-200 bg-white p-6 shadow-[0_12px_24px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-slate-900">Your projects</h2>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={toggleSelectMode}
              className="btn-secondary font-medium"
            >
              {selectionMode ? "Cancel" : "Select"}
            </button>
            {selectionMode && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selected.size === 0}
                className="btn-secondary border-rose-200 text-rose-600 hover:border-rose-400 hover:text-rose-700"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="btn-secondary"
            >
              {showAll ? "Collapse" : "View all"}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
        <div
          className={`mt-5 overflow-hidden transition-[max-height] duration-500 ${
            showAll ? "max-h-[2400px]" : "max-h-[520px]"
          }`}
        >
          <div className="divide-y divide-slate-100">
            {visibleProjects.map((project) => {
              const isSelected = selected.has(project.id);
              return (
                <div
                  key={project.id}
                  className="group flex flex-col gap-3 py-3 first:pt-0 last:pb-0 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] md:items-center md:gap-4 md:px-1 hover:bg-slate-50/60"
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
                  </div>
                  <p className="text-sm text-slate-500">Updated {project.updated}</p>
                  <div className="flex flex-wrap justify-start gap-3 text-sm md:justify-end">
                  <button
                    type="button"
                    className="btn-secondary gap-1 px-3 py-1"
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
                    href="/studio"
                    className="btn-primary gap-1 px-3 py-1"
                  >
                      Open
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
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
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameSave}
                className="btn-primary px-5 py-2"
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
