"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Trash2, X } from "lucide-react";
import ProjectCard from "./ProjectCard";

type Project = {
  id: string;
  title: string;
  updated: string;
  previewUrl?: string | null;
  pdfUrl?: string | null;
  pagesCount?: number;
  rotation?: number | null;
  hasPreview?: boolean;
};

type Props = {
  projects: (Project & { starred?: boolean })[];
  onProjectRenamed?: (id: string, title: string) => void;
  onProjectStarToggled?: (id: string, next: boolean) => void;
  onProjectCopied?: (
    project: {
      id: string;
      name?: string | null;
      updatedAt?: string | number | Date;
      pdfUrl?: string | null;
      pagesCount?: number | null;
      hasPreview?: boolean;
    },
    sourceId: string,
  ) => void;
};

type GridProps = Props & {
  onProjectTrashed?: (id: string) => void;
};

const TRASH_PROGRESS_MS = 1100;
const TRASH_TOAST_MS = 6500;

type TrashToastState = {
  ids: string[];
  label: string;
};

async function getPdfAccessTarget(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/pdf")) {
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), revoke: true };
  }

  const data = (await res.json().catch(() => null)) as { url?: string } | null;
  if (!data?.url) return null;
  return { url: data.url, revoke: false };
}

export default function AllProjectsGrid({
  projects,
  onProjectTrashed,
  onProjectRenamed,
  onProjectStarToggled,
  onProjectCopied,
}: GridProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState<null | "download" | "trash">(null);
  const [confirmTrashOpen, setConfirmTrashOpen] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Record<string, true>>({});
  const [mounted, setMounted] = useState(false);
  const [trashToast, setTrashToast] = useState<TrashToastState | null>(null);
  const [trashToastDismissing, setTrashToastDismissing] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);
  const trashToastTouchStartY = useRef<number | null>(null);

  const visibleProjects = projects.filter((project) => !hiddenIds[project.id]);
  const selectedIds = visibleProjects.filter((project) => selected[project.id]).map((project) => project.id);
  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!trashToast) return;
    setTrashToastDismissing(false);
    const timer = window.setTimeout(() => {
      setTrashToast(null);
    }, TRASH_TOAST_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [trashToast]);

  useEffect(() => {
    const clearSelection = () => {
      setSelected({});
      setConfirmTrashOpen(false);
    };
    window.addEventListener("workspace-clear-project-selection", clearSelection);
    return () => {
      window.removeEventListener("workspace-clear-project-selection", clearSelection);
    };
  }, []);

  const buildTrashToastLabel = (trashed: Array<{ title: string }>) => {
    if (trashed.length === 1) return `"${trashed[0].title}" moved to Trash`;
    return `${trashed.length} projects moved to Trash`;
  };

  const handleUndoTrash = async () => {
    if (!trashToast || undoBusy) return;
    setUndoBusy(true);
    const ids = [...trashToast.ids];
    setHiddenIds((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        delete next[id];
      });
      return next;
    });
    setTrashToast(null);
    await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/projects/${encodeURIComponent(id)}/trash`, { method: "DELETE" })
      )
    );
    setUndoBusy(false);
  };

  const handleTrashToastTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    trashToastTouchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleTrashToastTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startY = trashToastTouchStartY.current;
    trashToastTouchStartY.current = null;
    const endY = event.changedTouches[0]?.clientY;
    if (startY == null || endY == null) return;
    if (startY - endY >= 36) {
      setTrashToastDismissing(true);
      window.setTimeout(() => {
        setTrashToast(null);
        setTrashToastDismissing(false);
      }, 220);
    }
  };

  const handleBulkDownload = async () => {
    if (!selectedIds.length || bulkBusy) return;
    setBulkBusy("download");
    try {
      for (const id of selectedIds) {
        const project = visibleProjects.find((entry) => entry.id === id);
        const res = await fetch(`/api/projects/${encodeURIComponent(id)}/pdf`, { cache: "no-store" });
        if (!res.ok) continue;
        const target = await getPdfAccessTarget(res);
        if (!target?.url) continue;
        const anchor = document.createElement("a");
        anchor.href = target.url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.download = `${(project?.title || "Project").replace(/[\\/:*?\"<>|]+/g, "").trim() || "Project"}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        if (target.revoke) {
          window.setTimeout(() => {
            URL.revokeObjectURL(target.url);
          }, 60_000);
        }
      }
    } finally {
      setBulkBusy(null);
    }
  };

  const handleBulkTrash = async () => {
    if (!selectedIds.length || bulkBusy) return;
    const ids = [...selectedIds];
    const trashedProjects = visibleProjects.filter((project) => ids.includes(project.id));
    setConfirmTrashOpen(false);
    setBulkBusy("trash");
    setHiddenIds((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
    ids.forEach((id) => onProjectTrashed?.(id));
    setSelected({});
    void Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/projects/${encodeURIComponent(id)}/trash`, { method: "POST" })
      )
    );
    window.setTimeout(() => {
      setBulkBusy(null);
      setTrashToast({
        ids,
        label: buildTrashToastLabel(trashedProjects),
      });
    }, TRASH_PROGRESS_MS);
  };

  return (
    <>
      <div className="projects-grid mt-10 grid w-full grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
        {visibleProjects.map((project) => {
          const isSelected = !!selected[project.id];
          return (
            <div key={project.id} className="min-w-0">
              <ProjectCard
                project={project}
                isSelected={isSelected}
                hasSelection={hasSelection}
                starred={project.starred === true}
                onToggleSelected={toggleSelected}
                onToggleStar={onProjectStarToggled}
                onTrashed={(trashedProject) => {
                  setHiddenIds((prev) => ({ ...prev, [trashedProject.id]: true }));
                  onProjectTrashed?.(trashedProject.id);
                  setTrashToast({
                    ids: [trashedProject.id],
                    label: buildTrashToastLabel([{ title: trashedProject.title }]),
                  });
                }}
                onRenamed={onProjectRenamed}
                onCopied={onProjectCopied}
              />
            </div>
          );
        })}
      </div>
      {mounted
        ? createPortal(
            <>
              <div
                className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-[80] flex justify-center px-4 transition-all duration-200 ease-out sm:bottom-10 lg:bottom-14 xl:bottom-18 sm:px-6 ${
                  hasSelection
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-3 opacity-0"
                }`}
              >
                <div className="flex w-[min(520px,calc(100vw-2rem))] min-h-[72px] items-center justify-between rounded-[18px] border-2 border-slate-300 bg-white px-5 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.10),0_18px_36px_rgba(15,23,42,0.12)] dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelected({})}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label="Clear selection"
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                  <span className="px-2.5 text-base font-semibold text-slate-900 dark:text-zinc-100">
                    {selectedCount} selected
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      void handleBulkDownload();
                    }}
                    disabled={bulkBusy !== null}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label="Download selected projects"
                  >
                    <Download className="h-5 w-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmTrashOpen(true);
                    }}
                    disabled={bulkBusy !== null}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-rose-400"
                    aria-label="Move selected projects to trash"
                  >
                    <Trash2 className="h-5 w-5" aria-hidden />
                  </button>
                </div>
                </div>
              {confirmTrashOpen ? (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/25 px-4 backdrop-blur-[2px]">
                  <div className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-[0_20px_52px_rgba(15,23,42,0.24)] dark:bg-zinc-900">
                    <h3 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-zinc-100">
                      Send {selectedCount} {selectedCount === 1 ? "project" : "projects"} to Trash?
                    </h3>
                    <p className="mt-4 text-base font-medium text-slate-600 dark:text-zinc-300">
                      You can restore them from Trash for 30 days.
                    </p>
                    <div className="mt-7 flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setConfirmTrashOpen(false)}
                        className="rounded-xl border-2 border-slate-300 px-4 py-2 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleBulkTrash();
                        }}
                        className="rounded-xl bg-[#E11D48] px-5 py-2 text-base font-semibold text-white transition hover:bg-[#BE123C]"
                      >
                        Send to Trash
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {bulkBusy === "trash" ? (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/20 px-4 backdrop-blur-[1.5px]">
                  <div className="flex min-h-[132px] w-full max-w-[440px] flex-col justify-center rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-[0_20px_52px_rgba(15,23,42,0.24)] dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="text-center text-xl font-semibold text-slate-900 dark:text-zinc-100">
                      Moving to Trash
                    </p>
                    <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#C4B5FD] via-[#8B5CF6] to-[#5B21B6]"
                        style={{ animation: `trash-progress-fill ${TRASH_PROGRESS_MS}ms linear forwards` }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              {trashToast ? (
                <div
                  className={`fixed left-1/2 top-4 z-[10000] w-[min(460px,calc(100vw-1.5rem))] ${
                    trashToastDismissing
                      ? "[animation:copy-toast-dismiss-up_220ms_ease-out_forwards]"
                      : "[animation:copy-toast-in-out_6500ms_ease-in-out_forwards]"
                  }`}
                  onTouchStart={handleTrashToastTouchStart}
                  onTouchEnd={handleTrashToastTouchEnd}
                >
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700/70 bg-[#171923] px-3.5 py-2.5 text-white shadow-[0_10px_20px_rgba(15,23,42,0.34)]">
                    <p className="min-w-0 truncate pr-1.5 text-sm font-semibold">{trashToast.label}</p>
                    <button
                      type="button"
                      disabled={undoBusy}
                      onClick={() => {
                        void handleUndoTrash();
                      }}
                      className="shrink-0 rounded-md border-2 border-white/25 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                    >
                      {undoBusy ? "Undoing..." : "Undo"}
                    </button>
                  </div>
                </div>
              ) : null}
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
