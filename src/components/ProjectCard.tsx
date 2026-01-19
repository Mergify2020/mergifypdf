"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, Star, MoreHorizontal, ExternalLink, Copy, Link2, Trash2, Pencil } from "lucide-react";
import { useSession } from "next-auth/react";
import { refreshProjectsSummary } from "@/lib/projectsSummaryCache";
import { sanitizeProjectName } from "@/lib/projectName";

type Project = {
  id: string;
  title: string;
  updated: string;
  pdfUrl?: string | null;
  pagesCount?: number;
  rotation?: number | null;
  hasPreview?: boolean;
};

type ProjectCardProps = {
  project: Project;
  isSelected: boolean;
  hasSelection: boolean;
  showResumeBadge?: boolean;
  onToggleSelected: (id: string) => void;
  onRenamed?: (id: string, title: string) => void;
  onCopied?: (
    project: {
      id: string;
      name?: string | null;
      updatedAt?: string | number | Date;
      pdfUrl?: string | null;
      pagesCount?: number | null;
    },
    sourceId: string,
  ) => void;
};

export default function ProjectCard({
  project,
  isSelected,
  hasSelection,
  showResumeBadge = false,
  onToggleSelected,
  onRenamed,
  onCopied,
  onTrashed,
}: ProjectCardProps & { onTrashed?: (id: string) => void }) {
  const { data: session } = useSession();
  const ownerKey = session?.user?.id ?? null;
  const [starred, setStarred] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRefreshInFlight = useRef(false);
  const lastFailedPreviewRef = useRef<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleGlobalMouseDown() {
      setMenuOpen(false);
      setMenuPosition(null);
    }

    document.addEventListener("mousedown", handleGlobalMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleGlobalMouseDown);
    };
  }, [menuOpen]);

  const fetchPreviewUrl = async (signal?: AbortSignal) => {
    const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/preview`, {
      signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Preview fetch failed with status ${res.status}`);
    }
    const data = (await res.json().catch(() => null)) as { url?: string } | null;
    if (!data?.url) {
      throw new Error("Preview fetch returned an invalid payload.");
    }
    return data.url;
  };

  useEffect(() => {
    if (!project.hasPreview) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      try {
        const url = await fetchPreviewUrl(controller.signal);
        if (cancelled) return;
        lastFailedPreviewRef.current = null;
        setPreviewUrl(url);
      } catch {
        // fail silently
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [project.hasPreview, project.id]);

  const refreshPreviewUrl = async () => {
    if (!project.hasPreview || previewRefreshInFlight.current) return;
    previewRefreshInFlight.current = true;
    try {
      const url = await fetchPreviewUrl();
      lastFailedPreviewRef.current = null;
      setPreviewUrl(url);
    } catch {
      setPreviewUrl(null);
    } finally {
      previewRefreshInFlight.current = false;
    }
  };

  const cardClasses = [
    "relative overflow-hidden rounded-[10px] bg-[#F9FAFC] transition dark:bg-zinc-900 dark:shadow-[0_8px_18px_rgba(0,0,0,0.22)] dark:ring-0",
    isDeleting ? "pointer-events-none opacity-70 ring-2 ring-rose-500/70" : "",
    isSelected
      ? "ring-[3px] ring-[#4C6FFF] shadow-[0_0_0_4px_rgba(76,111,255,0.15)] dark:ring-zinc-200 dark:shadow-none"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const checkboxClasses = [
    "absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-[10px] border-[3px] text-xs font-semibold shadow-md dark:shadow-none transition-transform transition-opacity duration-150 xl:h-9 xl:w-9",
    isSelected
      ? "bg-[#4C6FFF] border-[#4C6FFF] text-white opacity-100 scale-100 dark:bg-zinc-200 dark:border-zinc-200 dark:text-zinc-900"
      : [
          // Always visible on very small screens (no hover), hover-only from sm and up.
          "bg-white/90 border-slate-200 text-slate-500 opacity-100 scale-100 dark:bg-zinc-900/90 dark:border-zinc-700 dark:text-zinc-300",
          "sm:opacity-0 sm:scale-90",
        ].join(" "),
  ]
    .filter(Boolean)
    .join(" ");
  const actionsContainerClasses = [
    "absolute right-3 top-2 z-10 inline-flex items-center overflow-hidden rounded-[10px] bg-white/95 text-slate-400 shadow-[0_4px_12px_rgba(15,23,42,0.18)] dark:bg-zinc-900/95 dark:text-zinc-200 dark:shadow-none",
    "opacity-100 scale-100 transition-transform transition-opacity duration-150",
    "sm:opacity-0 sm:scale-90",
  ]
    .filter(Boolean)
    .join(" ");
  const actionButtonBase =
    "flex h-9 w-9 items-center justify-center text-sm transition hover:bg-slate-100/80 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-800/80 xl:h-10 xl:w-10";

  const startRenaming = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault();
    event.stopPropagation();
    if (renameBusy) return;
    setDraftName(project.title);
    setRenameError(null);
    setRenaming(true);
  };

  const cancelRenaming = () => {
    if (renameBusy) return;
    setRenaming(false);
    setDraftName("");
    setRenameError(null);
  };

  const submitRename = async () => {
    if (renameBusy) return;
    const next = sanitizeProjectName(draftName);
    if (!next || next === project.title) {
      cancelRenaming();
      return;
    }

    setRenameBusy(true);
    try {
      setRenameError(null);
      const previousTitle = project.title;
      onRenamed?.(project.id, next);
      setRenaming(false);
      setDraftName("");

      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      if (!res.ok) {
        onRenamed?.(project.id, previousTitle);
        if (res.status === 404) {
          setRenameError("Couldn’t save — project not found. Refreshing…");
          void refreshProjectsSummary(ownerKey);
        } else {
          setRenameError("Couldn’t save. Try again.");
        }
        return;
      }
      void refreshProjectsSummary(ownerKey);
    } finally {
      setRenameBusy(false);
    }
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelRenaming();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      void submitRename();
    }
  };

  return (
    <div className="project-card group flex flex-col text-left transition" aria-label={project.title}>
      <div ref={cardRef} className={cardClasses}>
        <button
          type="button"
          className={`${checkboxClasses} project-card-select`}
          disabled={isDeleting}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSelected(project.id);
          }}
          aria-pressed={isSelected}
          aria-label={isSelected ? "Deselect project" : "Select project"}
        >
          {isSelected ? (
            <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
          ) : null}
        </button>
        {!hasSelection && (
          <>
            <div className={`${actionsContainerClasses} project-card-actions`}>
              <button
                type="button"
                className={`${actionButtonBase} ${starred ? "text-yellow-400" : ""}`}
                disabled={isDeleting}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setStarred((prev) => !prev);
                }}
                aria-pressed={starred}
                aria-label={starred ? "Unstar project" : "Star project"}
              >
                <Star
                  className={`h-6 w-6 ${starred ? "fill-current" : ""}`}
                  strokeWidth={2.4}
                  aria-hidden
                />
              </button>
              <div className="h-6 w-px bg-slate-200/80" aria-hidden />
              <button
                type="button"
                className={actionButtonBase}
                disabled={isDeleting}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const nextOpen = !menuOpen;
                  setMenuOpen(nextOpen);
                  if (!nextOpen) {
                    setMenuPosition(null);
                  } else if (cardRef.current && typeof window !== "undefined") {
                    const rect = cardRef.current.getBoundingClientRect();
                    const menuWidth = 320;
                    const margin = 16;
                    const overlap = 24;
                    const centerY = rect.top + rect.height / 2;
                    const top = Math.min(Math.max(centerY, margin), window.innerHeight - margin);
                    const clampLeft = (value: number) =>
                      Math.min(Math.max(value, margin), window.innerWidth - menuWidth - margin);
                    const preferredLeft = rect.right - overlap;
                    const left =
                      preferredLeft + menuWidth + margin > window.innerWidth
                        ? clampLeft(rect.left + overlap - menuWidth)
                        : clampLeft(preferredLeft);
                    setMenuPosition({
                      top,
                      left,
                    });
                  }
                }}
                aria-label="Project actions"
              >
                <MoreHorizontal className="h-6 w-6" strokeWidth={2.4} aria-hidden />
              </button>
            </div>
            {typeof document !== "undefined" &&
              menuOpen &&
              menuPosition &&
              createPortal(
                <div
                  role="menu"
                  aria-label="Project actions"
                  className="fixed z-[9999] w-80 -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-200 bg-white text-sm text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.20)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-none"
                  onMouseDown={(event) => {
                    // Prevent the global outside-click handler from firing for clicks inside the menu
                    event.stopPropagation();
                  }}
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  <div className="p-4 pb-3">
                    <p className="truncate text-base font-semibold text-slate-900 dark:text-zinc-100">{project.title}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-400">{project.updated}</p>
                  </div>
                  <div className="h-px bg-slate-100 dark:bg-zinc-800" />
                  <button
                    type="button"
                    role="menuitem"
                    className="mx-3 mt-2 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-zinc-800/70"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setMenuOpen(false);
                      setMenuPosition(null);
                    }}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                      <ExternalLink className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-base font-medium text-slate-900 dark:text-zinc-100">Open in new tab</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-zinc-800/70"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setMenuOpen(false);
                      setMenuPosition(null);
                      void (async () => {
                        try {
                          const res = await fetch(
                            `/api/projects/${encodeURIComponent(project.id)}/copy`,
                            { method: "POST" }
                          );
                          if (!res.ok) return;
                          const json = (await res.json().catch(() => null)) as
                            | {
                                project?: {
                                  id?: string;
                                  name?: string | null;
                                  updatedAt?: string | number | Date;
                                  pdfUrl?: string | null;
                                  pagesCount?: number | null;
                                };
                              }
                            | null;
                          const duplicated = json?.project;
                          if (!duplicated?.id) return;
                          onCopied?.(
                            { ...duplicated, id: duplicated.id, pdfUrl: duplicated.pdfUrl ?? null },
                            project.id
                          );
                          void refreshProjectsSummary(ownerKey);
                        } catch {
                          // ignore
                        }
                      })();
                    }}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                      <Copy className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-base font-medium text-slate-900 dark:text-zinc-100">Make a copy</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-zinc-800/70"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setMenuOpen(false);
                      setMenuPosition(null);
                    }}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                      <Link2 className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-base font-medium text-slate-900 dark:text-zinc-100">Copy link</span>
                  </button>
                  <div className="mx-3 my-2 h-px bg-slate-100 dark:bg-zinc-800" />
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isDeleting}
                    className="mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-800/60"
                    onClick={async (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (isDeleting) return;
                      setMenuOpen(false);
                      setMenuPosition(null);
                      setIsDeleting(true);
                      try {
                        const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/trash`, {
                          method: "POST",
                        });
                        if (!res.ok) {
                          throw new Error(`Trash request failed with status ${res.status}`);
                        }
                        await refreshProjectsSummary(ownerKey);
                        if (onTrashed) {
                          onTrashed(project.id);
                        }
                      } catch (err) {
                        console.error("Failed to move project to trash.", err);
                        setIsDeleting(false);
                      }
                    }}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                      {isDeleting ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-300 border-t-rose-700" />
                      ) : (
                        <Trash2 className="h-5 w-5" aria-hidden />
                      )}
                    </span>
                    <span className="text-base font-semibold text-rose-700">
                      {isDeleting ? "Moving to trash..." : "Move to trash"}
                    </span>
                  </button>
                </div>,
                document.body
              )}
          </>
        )}
        {isDeleting ? (
          <span
            className="absolute inset-0 z-10 flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-sm">
              <span className="absolute h-12 w-12 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
              <Trash2 className="h-5 w-5 text-rose-600" aria-hidden="true" />
            </span>
          </span>
        ) : null}
        <div className="project-card-preview relative m-[3px] w-[calc(100%-6px)] aspect-square rounded-[10px] bg-[#EEF1F5] border border-[rgba(0,0,0,0.06)] transition-colors dark:border-transparent dark:bg-zinc-800/70">
          <Link
            href={`/studio?project=${encodeURIComponent(project.id)}`}
            className="absolute inset-0"
            aria-label={`Open ${project.title}`}
            onClick={(event) => {
              if (isDeleting || renaming || hasSelection) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          />
          {typeof project.pagesCount === "number" && project.pagesCount > 0 ? (
            <div className="project-card-pages pointer-events-none absolute bottom-2.5 left-2.5 z-10 rounded-full bg-black/60 px-3.5 py-1 text-[12px] font-semibold text-white opacity-0 shadow-sm dark:shadow-none backdrop-blur-sm transition-opacity dark:bg-zinc-800/80 dark:text-zinc-100">
              {project.pagesCount} {project.pagesCount === 1 ? "page" : "pages"}
            </div>
          ) : null}
          <div
            aria-hidden="true"
            className="project-card-overlay pointer-events-none absolute inset-0 z-[5] bg-black/[0.03] opacity-0 transition-opacity duration-150"
            style={isDeleting ? { opacity: 0 } : undefined}
          />
          <div className="flex h-full w-full items-center justify-center p-3 sm:p-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                className="max-h-full max-w-full object-contain"
                onError={() => {
                  if (previewUrl && lastFailedPreviewRef.current !== previewUrl) {
                    lastFailedPreviewRef.current = previewUrl;
                    void refreshPreviewUrl();
                  } else {
                    setPreviewUrl(null);
                  }
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-zinc-600">
                <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden="true">
                  <path
                    d="M18 8h20l10 10v34a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    d="M38 8v10h10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M24 34h16M24 42h16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
          </div>
          {showResumeBadge && !isDeleting ? (
            <Link
              href={`/studio?project=${encodeURIComponent(project.id)}`}
              className="project-card-resume absolute bottom-2.5 right-2.5 rounded-full bg-[#2563EB] px-3.5 py-1 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]"
              aria-label={`Resume ${project.title}`}
            >
              Resume
            </Link>
          ) : null}
        </div>
      </div>
      <div className="mt-2 space-y-0.5">
        {renaming ? (
          <div className="flex min-h-[32px] items-center gap-2">
            <input
              value={draftName}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              disabled={renameBusy}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onChange={(event) => {
                setDraftName(event.target.value);
                if (renameError) setRenameError(null);
              }}
              onKeyDown={handleRenameKeyDown}
              onBlur={() => {
                void submitRename();
              }}
              className="w-full rounded-md border-2 border-[#E6EBF2] bg-slate-50/70 px-2 py-1 text-base font-semibold leading-tight text-slate-900 outline-none focus:border-[rgba(37,99,235,0.35)] focus:ring-0 disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-100"
            />
            <button
              type="button"
              aria-label="Confirm rename"
              disabled={renameBusy}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void submitRename();
              }}
              className="inline-flex h-6 w-6 items-center justify-center text-slate-500 transition hover:text-slate-700 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        ) : (
          <div className="project-card-title flex items-center gap-2">
            <button
              type="button"
              onClick={startRenaming}
              aria-label="Rename project"
              className="project-card-rename group/rename inline-flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
            >
              <span className="min-w-0 truncate text-base font-semibold text-slate-900 dark:text-zinc-100">
                {project.title}
              </span>
              {!hasSelection ? (
                <span className="project-card-pencil inline-flex items-center justify-center text-black opacity-0 transition-opacity group-hover/rename:opacity-100 dark:text-zinc-200">
                  <Pencil className="h-4 w-4" aria-hidden />
                </span>
              ) : null}
            </button>
            {showResumeBadge ? <span className="ml-auto shrink-0" /> : null}
          </div>
        )}
        {renameError ? (
          <p className="text-xs font-semibold text-rose-600">{renameError}</p>
        ) : null}
        <p
          className={`text-xs ${isDeleting ? "font-semibold text-rose-600 dark:text-rose-300" : "text-slate-500 dark:text-zinc-400"}`}
          suppressHydrationWarning
        >
          {isDeleting ? "Deleting..." : project.updated}
        </p>
      </div>
    </div>
  );
}
