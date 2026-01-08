"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Folder, MoreVertical } from "lucide-react";
import { useSession } from "next-auth/react";
import { sanitizeProjectName } from "@/lib/projectName";
import { formatProjectLastEdited } from "@/lib/formatProjectLastEdited";
import {
  RecentProjectEntry,
  loadRecentProjects,
  saveRecentProjects,
  subscribeRecentProjects,
} from "@/lib/recentProjects";

type ProjectItem = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  updated: string;
  previewUrl?: string | null;
  updatedAt?: number;
  persisted?: boolean;
};

type Props = {
  initialProjects: ProjectItem[];
};

function convertStoredEntry(entry: RecentProjectEntry): ProjectItem {
  return {
    id: entry.id,
    title: entry.title,
    subtitle: "Workspace project",
    status: "In progress",
    updatedAt: entry.updatedAt,
    updated: formatProjectLastEdited(entry.updatedAt),
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
  const [storageReady, setStorageReady] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const baseProjects = useMemo(() => initialProjects.filter((project) => !project.persisted), [initialProjects]);

  useEffect(() => {
    const syncFromStore = (entries?: RecentProjectEntry[]) => {
      const stored = (entries ?? loadRecentProjects(ownerId))
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
    syncFromStore();
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
    const unsubscribe = subscribeRecentProjects((update) => {
      if ((update.ownerKey ?? null) !== (ownerId ?? null)) return;
      syncFromStore(update.projects);
    });
    return () => unsubscribe();
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
            updated: formatProjectLastEdited(updatedAt),
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

  function toggleProjectMenu(projectId: string) {
    setOpenMenuId((current) => (current === projectId ? null : projectId));
  }

  return (
    <>
      <div className="rounded-[10px] border border-slate-200 bg-white p-6 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="inline-flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <Folder className="h-3.5 w-3.5" />
              Your projects
            </span>
          </h2>
          <div className="flex items-center gap-3 text-sm">
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
        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleProjects.map((project) => {
            const previewUrl = project.previewUrl ?? null;
            return (
              <div
                key={project.id}
                className="group relative flex flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/80 transition hover:-translate-y-1"
              >
                <div className="relative">
                  <div className="relative w-full aspect-[1.23/1] overflow-hidden rounded-[16px] bg-[#EEF1F5] border border-[rgba(0,0,0,0.06)]">
                    {previewUrl ? (
                      <div className="relative h-full w-full px-3 pt-4 pb-0">
                        <div className="flex h-full w-full items-start justify-center bg-white shadow-[0_10px_30px_rgba(15,23,42,0.16)] overflow-hidden">
                          <Image
                            src={previewUrl}
                            alt=""
                            width={800}
                            height={1100}
                            className="max-w-full h-auto object-contain object-[50%_0]"
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                            unoptimized={previewUrl.startsWith("data:image/")}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 animate-pulse bg-slate-100" />
                    )}
                  </div>
                  <span className="absolute left-4 top-4 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg">
                    Private
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleProjectMenu(project.id)}
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-lg transition hover:bg-white"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenuId === project.id ? (
                    <div className="absolute right-4 top-16 z-20 w-52 rounded-2xl border border-slate-200 bg-white py-2 text-sm text-slate-800 shadow-2xl">
                      <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                        Project
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          openRename(project);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 transition hover:bg-slate-50"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path
                            d="M16.5 3.5a2.121 2.121 0 013 3L7 19.5 3 21l1.5-4L16.5 3.5z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Rename project
                      </button>
                      <div className="mt-1 border-t border-slate-100" />
                      <div className="px-3 pt-2 text-xs text-slate-500">{project.updated}</div>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-slate-900">{project.title}</p>
                    <p className="text-sm text-slate-500">{project.subtitle}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between text-xs font-medium text-slate-500">
                    <div className="flex flex-col text-[12px]">
                      <span className="text-slate-400">Last edited</span>
                      <span>{project.updated}</span>
                    </div>
                    <Link
                      href={project.persisted ? `/studio?project=${encodeURIComponent(project.id)}` : "/studio"}
                      className="btn-primary gap-1 px-3 py-2 text-sm"
                    >
                      Open
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
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
