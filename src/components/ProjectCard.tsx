"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, Star, MoreHorizontal, ExternalLink, Copy, Trash2, Pencil, Loader2, Printer } from "lucide-react";
import { useSession } from "next-auth/react";
import { refreshProjectsSummary } from "@/lib/projectsSummaryCache";
import { projectNameToEditable, sanitizeProjectName } from "@/lib/projectName";

type PreviewCacheEntry = {
  url: string;
  fetchedAt: number;
};

const PREVIEW_CACHE_MAX_AGE_MS = 10 * 60 * 1000;
const PREVIEW_FETCH_TIMEOUT_MS = 8000;
const PREVIEW_IMAGE_TIMEOUT_MS = 10000;
const STARRED_STORAGE_KEY = "mpdf:starred-projects";
const previewMemoryCache = new Map<string, PreviewCacheEntry>();

function readPreviewCache(projectId: string): PreviewCacheEntry | null {
  const now = Date.now();
  const memory = previewMemoryCache.get(projectId);
  if (memory && now - memory.fetchedAt <= PREVIEW_CACHE_MAX_AGE_MS) return memory;
  return null;
}

function writePreviewCache(projectId: string, url: string) {
  const entry: PreviewCacheEntry = { url, fetchedAt: Date.now() };
  previewMemoryCache.set(projectId, entry);
}

function clearPreviewCache(projectId: string) {
  previewMemoryCache.delete(projectId);
}

function writeStoredStarred(projectId: string, next: boolean) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STARRED_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    const current = { ...parsed };
    current[projectId] = next;
    window.localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore storage write errors
  }
}

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
  starred?: boolean;
  onToggleSelected: (id: string) => void;
  onToggleStar?: (id: string, next: boolean) => void;
  onRenamed?: (id: string, title: string) => void;
  onCopied?: (
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

type CopyToastState = {
  id: string;
  name: string;
};

export default function ProjectCard({
  project,
  isSelected,
  hasSelection,
  showResumeBadge = false,
  starred: starredProp,
  onToggleSelected,
  onToggleStar,
  onRenamed,
  onCopied,
  onTrashed,
}: ProjectCardProps & { onTrashed?: (project: Project) => void }) {
  const { data: session } = useSession();
  const ownerKey = session?.user?.id ?? null;
  const [localStarred, setLocalStarred] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(Boolean(project.hasPreview));
  const previewRefreshInFlight = useRef(false);
  const lastFailedPreviewRef = useRef<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copyToast, setCopyToast] = useState<CopyToastState | null>(null);
  const [draftName, setDraftName] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameJustSaved, setRenameJustSaved] = useState(false);
  const starred = Boolean(starredProp || localStarred);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STARRED_STORAGE_KEY);
      if (!raw) {
        setLocalStarred(false);
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, boolean> | null;
      if (!parsed || typeof parsed !== "object") {
        setLocalStarred(false);
        return;
      }
      setLocalStarred(Boolean(parsed[project.id]));
    } catch {
      setLocalStarred(false);
    }
  }, [project.id]);

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

  useEffect(() => {
    if (!copyToast) return;
    const timer = window.setTimeout(() => {
      setCopyToast(null);
    }, 6500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [copyToast]);

  async function handlePrint(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/pdf`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as { url?: string } | null;
      if (!data?.url) return;
      const printUrl = `/print?src=${encodeURIComponent(data.url)}&title=${encodeURIComponent(project.title)}`;
      window.open(printUrl, "_blank", "noopener,noreferrer");
      setMenuOpen(false);
      setMenuPosition(null);
    } finally {
      setIsPrinting(false);
    }
  }

  useEffect(() => {
    if (!renameJustSaved) return;
    const timer = window.setTimeout(() => {
      setRenameJustSaved(false);
    }, 1400);
    return () => {
      window.clearTimeout(timer);
    };
  }, [renameJustSaved]);

  const fetchPreviewUrl = async (signal?: AbortSignal) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, PREVIEW_FETCH_TIMEOUT_MS);
    const handleAbort = () => {
      controller.abort();
    };
    signal?.addEventListener("abort", handleAbort, { once: true });
    const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/preview`, {
      signal: controller.signal,
      cache: "no-store",
    }).finally(() => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", handleAbort);
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
      setPreviewLoading(false);
      clearPreviewCache(project.id);
      return;
    }

    const cached = readPreviewCache(project.id);
    if (cached?.url) {
      setPreviewUrl(cached.url);
      setPreviewLoading(false);
    } else {
      setPreviewLoading(true);
    }

    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      try {
        const url = await fetchPreviewUrl(controller.signal);
        if (cancelled) return;
        lastFailedPreviewRef.current = null;
        writePreviewCache(project.id, url);
        setPreviewUrl(url);
      } catch {
        if (!cancelled && !cached?.url) setPreviewLoading(false);
        // fail silently
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [project.hasPreview, project.id]);

  useEffect(() => {
    if (!previewLoading || !previewUrl) return;
    const timer = window.setTimeout(() => {
      // Fail fast when image loading hangs so cards don't shimmer indefinitely.
      clearPreviewCache(project.id);
      setPreviewUrl(null);
      setPreviewLoading(false);
    }, PREVIEW_IMAGE_TIMEOUT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [previewLoading, previewUrl, project.id]);

  const refreshPreviewUrl = async () => {
    if (!project.hasPreview || previewRefreshInFlight.current) return;
    setPreviewLoading(true);
    previewRefreshInFlight.current = true;
    try {
      const url = await fetchPreviewUrl();
      lastFailedPreviewRef.current = null;
      writePreviewCache(project.id, url);
      setPreviewUrl(url);
    } catch {
      clearPreviewCache(project.id);
      setPreviewUrl(null);
      setPreviewLoading(false);
    } finally {
      previewRefreshInFlight.current = false;
    }
  };

  const cardClasses = [
    "relative overflow-hidden rounded-[10px] bg-[#F9FAFC] transition dark:bg-zinc-900 dark:shadow-[0_8px_18px_rgba(0,0,0,0.22)] dark:ring-0",
    isSelected
      ? "ring-[3px] ring-[#6C47FF] shadow-[0_0_0_4px_rgba(108,71,255,0.18)] dark:ring-[#A78BFA] dark:shadow-none"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const checkboxClasses = [
    "absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-[10px] border-[3px] text-xs font-semibold shadow-md dark:shadow-none transition-transform transition-opacity duration-150 xl:h-9 xl:w-9",
    isSelected
      ? "bg-[#6C47FF] border-[#6C47FF] text-white opacity-100 scale-100 dark:bg-[#A78BFA] dark:border-[#A78BFA] dark:text-zinc-900"
      : [
          // Always visible on very small screens (no hover), hover-only from sm and up.
          "bg-white border-slate-300 text-slate-500 shadow-[0_3px_10px_rgba(15,23,42,0.14)] opacity-100 scale-100 dark:bg-zinc-900/95 dark:border-zinc-600 dark:text-zinc-300",
          "sm:opacity-0 sm:scale-90",
          hasSelection ? "sm:!opacity-100 sm:!scale-100" : "",
        ].join(" "),
  ]
    .filter(Boolean)
    .join(" ");
  const actionsContainerClasses = [
    "absolute right-3 top-2 z-10 inline-flex items-center overflow-hidden rounded-[10px] bg-white/95 text-slate-400 shadow-[0_4px_12px_rgba(15,23,42,0.18)] dark:bg-zinc-900/95 dark:text-zinc-200 dark:shadow-none",
    "opacity-100 transition-opacity duration-150",
    "sm:opacity-0",
    menuOpen ? "sm:!opacity-100" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const actionButtonBase =
    "flex h-9 w-9 items-center justify-center text-sm transition hover:bg-slate-100/80 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-800/80 xl:h-10 xl:w-10";

  const startRenaming = (event?: { preventDefault: () => void; stopPropagation: () => void }) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (renameBusy) return;
    setDraftName(projectNameToEditable(project.title));
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
    const currentTitle = projectNameToEditable(project.title);
    if (!next || next === currentTitle) {
      cancelRenaming();
      return;
    }

    setRenameBusy(true);
    try {
      setRenameError(null);
      const previousTitle = project.title;
      onRenamed?.(project.id, next);
      setRenameJustSaved(true);
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
        setRenameJustSaved(false);
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
                className={`${actionButtonBase} ${
                  starred ? "text-amber-500 dark:text-amber-300" : ""
                }`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const next = !starred;
                  setLocalStarred(next);
                  writeStoredStarred(project.id, next);
                  if (onToggleStar) {
                    onToggleStar(project.id, next);
                  }
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
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const nextOpen = !menuOpen;
                  setMenuOpen(nextOpen);
                  if (!nextOpen) {
                    setMenuPosition(null);
                  } else if (typeof window !== "undefined") {
                    const trigger = event.currentTarget.getBoundingClientRect();
                    const menuWidth = 256;
                    const menuHeight = 252;
                    const margin = 16;
                    const clampLeft = (value: number) =>
                      Math.min(Math.max(value, margin), window.innerWidth - menuWidth - margin);
                    const left = clampLeft(trigger.right - menuWidth);
                    const preferredBelow = trigger.bottom + 8;
                    const maxTop = window.innerHeight - menuHeight - margin;
                    const top =
                      preferredBelow <= maxTop
                        ? preferredBelow
                        : Math.max(margin, trigger.top - menuHeight - 8);
                    setMenuPosition({
                      top,
                      left,
                    });
                  }
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                aria-label="Project actions"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-[8px] ${
                    menuOpen
                      ? "bg-[#6C47FF] text-white dark:bg-[#6C47FF] dark:text-white"
                      : "text-inherit"
                  }`}
                >
                  <MoreHorizontal className="h-5 w-5" strokeWidth={2.4} aria-hidden />
                </span>
              </button>
            </div>
            {typeof document !== "undefined" &&
              menuOpen &&
              menuPosition &&
              createPortal(
                <div
                  role="menu"
                  aria-label="Project actions"
                  className="project-actions-menu fixed z-[9999] w-64 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white text-sm text-slate-800 shadow-[0_16px_36px_rgba(15,23,42,0.14)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[0_20px_44px_rgba(0,0,0,0.5)]"
                  onMouseDown={(event) => {
                    // Prevent the global outside-click handler from firing for clicks inside the menu
                    event.stopPropagation();
                  }}
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  <div className="px-3 py-2.5">
                    {renaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={draftName}
                          autoFocus
                          spellCheck={false}
                          autoComplete="off"
                          disabled={renameBusy}
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                          onChange={(event) => {
                            setDraftName(event.target.value);
                            if (renameError) setRenameError(null);
                          }}
                          onKeyDown={handleRenameKeyDown}
                          onBlur={() => {
                            cancelRenaming();
                          }}
                          className="w-full rounded-md border-2 border-[#6C47FF]/55 bg-slate-50/70 px-2 py-1 text-sm font-semibold leading-tight text-slate-900 outline-none focus:border-[#6C47FF] focus:ring-0 disabled:opacity-70 dark:border-[#6C47FF]/65 dark:bg-zinc-900/60 dark:text-zinc-100"
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
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center text-[#6C47FF] transition hover:text-[#5B38E6] disabled:opacity-60 dark:text-[#BBA6FF] dark:hover:text-[#CFC4FF]"
                        >
                          <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const next = !starred;
                            setLocalStarred(next);
                            writeStoredStarred(project.id, next);
                            if (onToggleStar) {
                              onToggleStar(project.id, next);
                            }
                          }}
                          className={`inline-flex h-5 w-5 flex-none items-center justify-center transition ${
                            starred
                              ? "text-amber-500 dark:text-amber-300"
                              : "text-slate-300 hover:text-amber-400 dark:text-zinc-600 dark:hover:text-amber-300"
                          }`}
                          aria-label={starred ? "Unstar project" : "Star project"}
                          aria-pressed={starred}
                        >
                          <Star className={`h-4 w-4 ${starred ? "fill-current" : ""}`} aria-hidden />
                        </button>
                        <div className="min-w-0 flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">
                            {project.title}
                          </p>
                          <button
                            type="button"
                            aria-label="Rename project"
                            className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md text-slate-500 transition hover:bg-[#F8FAFC] hover:text-slate-700 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
                            onClick={(event) => {
                              startRenaming(event);
                            }}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-400">{project.updated}</p>
                  </div>
                  <div className="h-px bg-[#E6EBF2] dark:bg-zinc-800" />
                  <button
                    type="button"
                    role="menuitem"
                    className="mx-2 mt-1 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] dark:text-zinc-100 dark:hover:bg-zinc-800/70"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setMenuOpen(false);
                      setMenuPosition(null);
                    }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center text-current">
                      <ExternalLink className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-[15px] font-medium text-slate-900 dark:text-zinc-100">Open in new tab</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] dark:text-zinc-100 dark:hover:bg-zinc-800/70"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      startRenaming(event);
                    }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center text-current">
                      <Pencil className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-[15px] font-medium text-slate-900 dark:text-zinc-100">Rename</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isPrinting}
                    aria-disabled={isPrinting}
                    className="mx-2 flex w-[calc(100%-1rem)] items-center justify-between rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:bg-zinc-800/70"
                    onClick={handlePrint}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center text-current">
                        {isPrinting ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Printer className="h-4 w-4" aria-hidden />
                        )}
                      </span>
                      <span className="text-[15px] font-medium">Print</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled
                    aria-disabled="true"
                    className="mx-2 flex w-[calc(100%-1rem)] items-center justify-between rounded-lg px-2.5 py-2 text-left text-slate-500 opacity-55 transition disabled:cursor-not-allowed dark:text-zinc-400"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center text-current">
                        <Copy className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-[15px] font-medium">Convert to...</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isCopying}
                    className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:bg-zinc-800/70"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (isCopying) return;
                      setIsCopying(true);
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
                                  hasPreview?: boolean;
                                };
                              }
                            | null;
                          const duplicated = json?.project;
                          if (!duplicated?.id) return;
                          onCopied?.(
                            { ...duplicated, id: duplicated.id, pdfUrl: duplicated.pdfUrl ?? null },
                            project.id
                          );
                          setCopyToast({
                            id: duplicated.id,
                            name: duplicated.name?.trim() || "Untitled project",
                          });
                          setMenuOpen(false);
                          setMenuPosition(null);
                          void refreshProjectsSummary(ownerKey);
                        } catch {
                          // ignore
                        } finally {
                          setIsCopying(false);
                        }
                      })();
                    }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center text-current">
                      {isCopying ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden />
                      )}
                    </span>
                    <span className="text-[15px] font-medium text-slate-900 dark:text-zinc-100">Make a copy</span>
                  </button>
                  <div className="mx-2 my-1 h-px bg-[#E6EBF2] dark:bg-zinc-800" />
                  <button
                    type="button"
                    role="menuitem"
                    className="mx-2 mb-1.5 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-rose-700 transition hover:bg-rose-50 dark:hover:bg-zinc-800/60"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setMenuOpen(false);
                      setMenuPosition(null);
                      onTrashed?.(project);
                      void (async () => {
                        try {
                          const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/trash`, {
                            method: "POST",
                          });
                          if (!res.ok) {
                            throw new Error(`Trash request failed with status ${res.status}`);
                          }
                          await refreshProjectsSummary(ownerKey);
                        } catch (err) {
                          console.error("Failed to move project to trash.", err);
                        }
                      })();
                    }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center text-rose-700">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-[15px] font-semibold text-rose-700">Move to trash</span>
                  </button>
                </div>,
                document.body
              )}
          </>
        )}
        {typeof document !== "undefined" && copyToast
          ? createPortal(
              <div className="fixed left-1/2 top-4 z-[10000] w-[min(420px,calc(100vw-1.5rem))] [animation:copy-toast-in-out_6500ms_ease-in-out_forwards]">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-[#171923] px-3.5 py-2.5 text-white shadow-[0_10px_20px_rgba(15,23,42,0.34)]">
                  <p className="min-w-0 truncate pr-1.5 text-sm font-semibold">
                    {`Created "Copy of ${copyToast.name}"`}
                  </p>
                  <Link
                    href={`/studio?project=${encodeURIComponent(copyToast.id)}`}
                    className="shrink-0 rounded-md border-2 border-white/25 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/10"
                    onClick={() => setCopyToast(null)}
                  >
                    Open
                  </Link>
                </div>
              </div>,
              document.body
            )
          : null}
        <div className="project-card-preview relative m-[3px] w-[calc(100%-6px)] aspect-square rounded-[10px] bg-[#EEF1F5] border border-[rgba(0,0,0,0.06)] transition-colors dark:border-transparent dark:bg-zinc-800/70">
          <Link
            href={`/studio?project=${encodeURIComponent(project.id)}`}
            className="absolute inset-0"
            aria-label={`Open ${project.title}`}
            onClick={(event) => {
              if (hasSelection) {
                event.preventDefault();
                event.stopPropagation();
                onToggleSelected(project.id);
                return;
              }
              if (renaming) {
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
          />
          <div className="flex h-full w-full items-center justify-center p-3 sm:p-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                className={`max-h-full max-w-full object-contain transition-opacity duration-200 ${
                  previewLoading ? "opacity-0" : "opacity-100"
                }`}
                onLoad={() => {
                  setPreviewLoading(false);
                }}
                onError={() => {
                  setPreviewLoading(false);
                  if (previewUrl && lastFailedPreviewRef.current !== previewUrl) {
                    lastFailedPreviewRef.current = previewUrl;
                    void refreshPreviewUrl();
                  } else {
                    clearPreviewCache(project.id);
                    setPreviewUrl(null);
                  }
                }}
              />
            ) : (
              !previewLoading ? (
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
              ) : null
            )}
          </div>
          {previewLoading ? (
            <span className="pointer-events-none absolute inset-0 z-[6] overflow-hidden rounded-[10px] bg-slate-200/70 dark:bg-zinc-700/50">
              <span className="absolute inset-0 skeleton-shimmer opacity-90" />
            </span>
          ) : null}
          {showResumeBadge && !isSelected ? (
            <Link
              href={`/studio?project=${encodeURIComponent(project.id)}`}
              className="project-card-resume absolute bottom-2.5 right-2.5 hidden rounded-full bg-[#6C47FF] px-3.5 py-1 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[#5B38E6] sm:inline-flex"
              aria-label={`Resume ${project.title}`}
            >
              Resume
            </Link>
          ) : null}
        </div>
      </div>
      <div className="mt-2 space-y-0.5">
        {renaming && !menuOpen ? (
          <div className="flex min-h-[32px] items-center gap-2">
            <input
              value={draftName}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              disabled={renameBusy}
              onClick={(event) => {
                event.stopPropagation();
              }}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onChange={(event) => {
                setDraftName(event.target.value);
                if (renameError) setRenameError(null);
              }}
              onKeyDown={handleRenameKeyDown}
              onBlur={() => {
                cancelRenaming();
              }}
              className="w-full rounded-md border-2 border-[#6C47FF]/55 bg-slate-50/70 px-2 py-1 text-base font-semibold leading-tight text-slate-900 outline-none focus:border-[#6C47FF] focus:ring-0 disabled:opacity-70 dark:border-[#6C47FF]/65 dark:bg-zinc-900/60 dark:text-zinc-100"
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
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              className="inline-flex h-6 w-6 items-center justify-center text-[#6C47FF] transition hover:text-[#5B38E6] disabled:opacity-60 dark:text-[#BBA6FF] dark:hover:text-[#CFC4FF]"
            >
              <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        ) : (
          <div className="project-card-title flex items-start gap-2">
            <button
              type="button"
              onClick={startRenaming}
              aria-label="Rename project"
              className="project-card-rename group/rename min-w-0 flex-1 rounded-lg py-1 text-left"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`min-w-0 truncate text-base font-semibold text-slate-900 dark:text-zinc-100 ${
                    renameJustSaved ? "[animation:rename-text-flash_1400ms_ease-out_forwards]" : ""
                  }`}
                >
                  {project.title}
                </span>
                {!hasSelection ? (
                  <span className="project-card-pencil inline-flex items-center justify-center text-black transition-opacity duration-150 dark:text-zinc-200 md:opacity-0 md:group-hover/rename:opacity-100 md:group-focus-visible/rename:opacity-100">
                    <Pencil className="h-4 w-4" aria-hidden />
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-zinc-400" suppressHydrationWarning>
                {project.updated}
              </p>
            </button>
            {showResumeBadge ? <span className="mt-1 ml-auto shrink-0" /> : null}
          </div>
        )}
        {renameError ? (
          <p className="text-xs font-semibold text-rose-600">{renameError}</p>
        ) : null}
      </div>
    </div>
  );
}
