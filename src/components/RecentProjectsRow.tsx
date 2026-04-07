"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { Check, ChevronRight, Copy, Download, ExternalLink, Loader2, MoreHorizontal, Pencil, Printer, SearchX, Star, Trash2, X } from "lucide-react";
import ProjectCard from "./ProjectCard";
import { matchesSearch } from "@/lib/search";
import { formatProjectActivityDate, formatProjectLastEdited } from "@/lib/formatProjectLastEdited";
import { formatFileSize } from "@/lib/formatFileSize";
import { projectNameToDisplay, projectNameToEditable, sanitizeProjectName } from "@/lib/projectName";

type SummaryProject = {
  id: string;
  name: string;
  updatedAt: string | Date;
  pdfUrl?: string | null;
  pagesCount?: number | null;
  rotation?: number | null;
  hasPreview?: boolean;
  fileSizeBytes?: number | null;
};

type Props = {
  initialProjects?: SummaryProject[];
  query?: string;
  ownerFilter?: "any" | "shared" | "you";
  sortOption?: "activity" | "starred" | "az" | "za";
  viewMode?: "grid" | "list";
  showAllProjects?: boolean;
  showResumeBadge?: boolean;
};

const TRASH_PROGRESS_MS = 1100;
const TRASH_TOAST_MS = 6500;

type TrashToastState = {
  ids: string[];
  label: string;
  projects: SummaryProject[];
};

type CopyToastState = {
  id: string;
  name: string;
};

const STARRED_STORAGE_KEY = "mpdf:starred-projects";

function readStarredFromStorage(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STARRED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean> | null;
    if (!parsed || typeof parsed !== "object") return {};
    const next: Record<string, true> = {};
    Object.keys(parsed).forEach((id) => {
      if (parsed[id]) next[id] = true;
    });
    return next;
  } catch {
    return {};
  }
}

function writeStarredToStorage(starredById: Record<string, true>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify(starredById));
  } catch {
    // ignore storage write errors
  }
}

function isMobileListMenuViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function getListMenuPosition(trigger: DOMRect) {
  const menuWidth = 256;
  const margin = 16;
  const gap = 2;
  const isMobileViewport = isMobileListMenuViewport();
  const menuHeight = isMobileViewport ? 296 : 320;
  const mobileBottomDockReserve = isMobileViewport ? 76 : 0;
  const clampLeft = (value: number) =>
    Math.min(Math.max(value, margin), window.innerWidth - menuWidth - margin);
  const clampTop = (value: number) =>
    Math.min(
      Math.max(value, margin),
      window.innerHeight - menuHeight - margin - mobileBottomDockReserve
    );
  const left = isMobileViewport
    ? clampLeft(trigger.left - menuWidth - gap)
    : clampLeft(trigger.right - menuWidth);
  const top = isMobileViewport
    ? clampTop(trigger.top)
    : (() => {
        const preferredBelow = trigger.bottom + gap;
        const maxTop = window.innerHeight - menuHeight - margin;
        return preferredBelow <= maxTop
          ? preferredBelow
          : Math.max(margin, trigger.top - menuHeight - gap);
      })();

  return { top, left };
}

function openReservedTab() {
  if (typeof window === "undefined") return null;
  const reserved = window.open("", "_blank");
  if (reserved) {
    reserved.opener = null;
  }
  return reserved;
}

function shouldUsePrintHandoff() {
  return typeof window !== "undefined" && !window.matchMedia("(max-width: 767px)").matches;
}

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

export default function RecentProjectsRow({
  initialProjects,
  query = "",
  ownerFilter = "any",
  sortOption = "activity",
  viewMode = "grid",
  showAllProjects = false,
  showResumeBadge = false,
}: Props) {
  const [projects, setProjects] = useState<SummaryProject[]>(initialProjects ?? []);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState<null | "download" | "trash">(null);
  const [confirmTrashOpen, setConfirmTrashOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [trashToast, setTrashToast] = useState<TrashToastState | null>(null);
  const [trashToastDismissing, setTrashToastDismissing] = useState(false);
  const [copyToast, setCopyToast] = useState<CopyToastState | null>(null);
  const [copyToastDismissing, setCopyToastDismissing] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);
  const [starredById, setStarredById] = useState<Record<string, true>>({});
  const [listMenuOpenId, setListMenuOpenId] = useState<string | null>(null);
  const [listMenuPosition, setListMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [listMenuCopyingId, setListMenuCopyingId] = useState<string | null>(null);
  const [listMenuPrintingId, setListMenuPrintingId] = useState<string | null>(null);
  const [listMenuRenamingId, setListMenuRenamingId] = useState<string | null>(null);
  const [listMenuAnimateIn, setListMenuAnimateIn] = useState(false);
  const [listRenamingId, setListRenamingId] = useState<string | null>(null);
  const [listRenameDraft, setListRenameDraft] = useState("");
  const [listRenameBusy, setListRenameBusy] = useState(false);
  const [renamedProjectId, setRenamedProjectId] = useState<string | null>(null);
  const trashToastTouchStartY = useRef<number | null>(null);
  const copyToastTouchStartY = useRef<number | null>(null);
  const loading = false;

  const closeListMenu = () => {
    setListMenuOpenId(null);
    setListMenuPosition(null);
    setListMenuRenamingId(null);
    setListMenuAnimateIn(false);
  };

  useEffect(() => {
    setProjects(initialProjects ?? []);
  }, [initialProjects]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setStarredById(readStarredFromStorage());
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
    if (!copyToast) return;
    setCopyToastDismissing(false);
    const timer = window.setTimeout(() => {
      setCopyToast(null);
    }, TRASH_TOAST_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [copyToast]);

  useEffect(() => {
    if (!renamedProjectId) return;
    const timer = window.setTimeout(() => {
      setRenamedProjectId(null);
    }, 1400);
    return () => {
      window.clearTimeout(timer);
    };
  }, [renamedProjectId]);

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

  useEffect(() => {
    if (!listMenuOpenId) return;
    const handleMouseDown = () => closeListMenu();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeListMenu();
    };
    const handleScroll = () => {
      if (isMobileListMenuViewport()) closeListMenu();
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    if (isMobileListMenuViewport()) {
      document.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleScroll);
    }
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [listMenuOpenId]);

  async function handleListMenuPrint(project: {
    id: string;
    title: string;
  }) {
    if (listMenuPrintingId === project.id) return;
    const reservedTab = openReservedTab();
    setListMenuPrintingId(project.id);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/pdf`, {
        cache: "no-store",
      });
      if (!res.ok) {
        reservedTab?.close();
        return;
      }
      const target = await getPdfAccessTarget(res);
      if (!target?.url) {
        reservedTab?.close();
        return;
      }
      const destinationUrl = shouldUsePrintHandoff()
        ? `/print?src=${encodeURIComponent(target.url)}&title=${encodeURIComponent(project.title || "Document")}`
        : target.url;
      if (reservedTab) {
        reservedTab.location.href = destinationUrl;
      } else {
        window.location.href = destinationUrl;
      }
      if (target.revoke) {
        window.setTimeout(() => {
          URL.revokeObjectURL(target.url);
        }, 60_000);
      }
      setListMenuOpenId(null);
      setListMenuPosition(null);
    } finally {
      setListMenuPrintingId(null);
    }
  }

  if (!projects.length && !loading) {
    return (
      <div className="mt-6 flex min-h-[260px] w-full flex-col items-center justify-center px-8 py-12 text-center">
        <Image
          src="/noprojectyet.svg"
          alt=""
          width={405}
          height={405}
          className="mt-[-100px] h-[318px] w-[318px] opacity-90 sm:h-[405px] sm:w-[405px]"
          priority
        />
        <p className="-mt-5 text-lg font-semibold text-slate-900 dark:text-zinc-100 sm:text-xl">No projects yet</p>
        <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-zinc-300 sm:text-base">Start a new project to see it here.</p>
      </div>
    );
  }

  if (loading && !projects.length) {
    return (
      <div className="recent-projects-grid projects-grid mt-2 grid w-full max-w-[1880px] items-start gap-4 sm:gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`home-loading-project-${index}`}
            className="flex w-full flex-col text-left"
          >
            <div className="relative rounded-[10px] bg-[#F9FAFC] dark:bg-[#323232]/60">
              <div className="relative m-[3px] aspect-square w-[calc(100%-6px)] overflow-hidden rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-[#EEF1F5] dark:border-zinc-800 dark:bg-[#2B2B2B]/70">
                <div className="absolute inset-0 rounded-[10px] skeleton-shimmer opacity-90" />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <div className="h-4 w-[58%] rounded-full bg-slate-100 dark:bg-[#2B2B2B]/70" />
              <div className="h-3 w-[42%] rounded-full bg-slate-100 dark:bg-[#2B2B2B]/70" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const trimmed = query.trim();
  let visibleProjects = ownerFilter === "shared" ? [] : projects;
  if (sortOption === "starred") {
    visibleProjects = visibleProjects.filter((project) => starredById[project.id]);
  }
  const filteredProjects = trimmed
    ? visibleProjects.filter((project) => matchesSearch(project.name?.trim() || "Untitled project", trimmed))
    : visibleProjects;
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortOption === "starred") {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
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
    title: projectNameToDisplay(project.name),
    updated: formatProjectLastEdited(project.updatedAt),
    pdfUrl: project.pdfUrl ?? null,
    pagesCount: project.pagesCount ?? 0,
    rotation: project.rotation ?? 0,
    hasPreview: project.hasPreview ?? false,
    fileSizeBytes: project.fileSizeBytes ?? null,
  }));
  const selectedIds = mapped.filter((project) => selected[project.id]).map((project) => project.id);
  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;
  const allVisibleSelected = mapped.length > 0 && mapped.every((project) => selected[project.id]);
  const submitListRename = async (projectId: string) => {
    if (listRenameBusy) return;
    const currentProject = projects.find((entry) => entry.id === projectId);
    if (!currentProject) {
      setListMenuRenamingId(null);
      setListRenamingId(null);
      setListRenameDraft("");
      return;
    }

    const next = sanitizeProjectName(listRenameDraft);
    if (!next || next === currentProject.name) {
      setListMenuRenamingId(null);
      setListRenamingId(null);
      setListRenameDraft("");
      return;
    }

    const previousName = currentProject.name;
    setListRenameBusy(true);
    setRenamedProjectId(projectId);
    setProjects((prev) => prev.map((entry) => (entry.id === projectId ? { ...entry, name: next } : entry)));

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });

      if (!res.ok) {
        setRenamedProjectId(null);
        setProjects((prev) =>
          prev.map((entry) => (entry.id === projectId ? { ...entry, name: previousName } : entry))
        );
      }
    } finally {
      setListRenameBusy(false);
      setListMenuRenamingId(null);
      setListMenuOpenId(null);
      setListMenuPosition(null);
      setListRenamingId(null);
      setListRenameDraft("");
    }
  };
  const toggleProjectStar = (projectId: string) => {
    const next = !(starredById[projectId] === true);
    setStarredById((prev) => {
      let updated: Record<string, true>;
      if (next) {
        updated = { ...prev, [projectId]: true };
      } else {
        const copy: Record<string, true> = { ...prev };
        delete copy[projectId];
        updated = copy;
      }
      writeStarredToStorage(updated);
      return updated;
    });
  };

  if (trimmed && mapped.length === 0) {
    if (viewMode === "list" && showAllProjects) {
      return (
        <div className="mt-2 px-6 py-14">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-[#2B2B2B] dark:text-zinc-200">
              <SearchX className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-zinc-100">
              No projects found for &quot;{trimmed}&quot;
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-300">
              Try a different name or clear the search.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="mt-2 flex min-h-[320px] items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-[#2B2B2B] dark:text-zinc-200">
            <SearchX className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-4 text-xl font-semibold text-slate-900 dark:text-zinc-100">
            No projects found for &quot;{trimmed}&quot;
          </p>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-zinc-300">
            Try a different project name, or clear the search to see everything again.
          </p>
        </div>
      </div>
    );
  }

  const handleBulkDownload = async () => {
    if (!selectedIds.length || bulkBusy) return;
    setBulkBusy("download");
    try {
      for (const id of selectedIds) {
        const project = mapped.find((entry) => entry.id === id);
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
    const removedProjects = projects.filter((project) => ids.includes(project.id));
    setConfirmTrashOpen(false);
    setBulkBusy("trash");
    setProjects((prev) => prev.filter((project) => !ids.includes(project.id)));
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
        projects: removedProjects,
        label:
          removedProjects.length === 1
            ? `"${removedProjects[0].name?.trim() || "Untitled project"}" moved to Trash`
            : `${removedProjects.length} projects moved to Trash`,
      });
    }, TRASH_PROGRESS_MS);
  };

  const handleUndoTrash = async () => {
    if (!trashToast || undoBusy) return;
    setUndoBusy(true);
    const restoreProjects = [...trashToast.projects];
    setProjects((prev) => {
      const existing = new Set(prev.map((project) => project.id));
      const toRestore = restoreProjects.filter((project) => !existing.has(project.id));
      return [...toRestore, ...prev];
    });
    setTrashToast(null);
    await Promise.allSettled(
      trashToast.ids.map((id) =>
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

  const handleProjectCopied = (
    duplicated: {
      id?: string;
      name?: string | null;
      updatedAt?: string | number | Date;
      pdfUrl?: string | null;
      pagesCount?: number | null;
      hasPreview?: boolean;
    },
    sourceId: string
  ) => {
    const nextId = duplicated.id;
    if (!nextId) return;
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
        hasPreview: duplicated.hasPreview ?? false,
      };
      const withoutNew = prev.filter((entry) => entry.id !== nextId);
      const sourceIndex = withoutNew.findIndex((entry) => entry.id === sourceId);
      if (sourceIndex === -1) return [nextEntry, ...withoutNew];
      const next = [...withoutNew];
      next.splice(sourceIndex + 1, 0, nextEntry);
      return next;
    });
    setCopyToast({
      id: nextId,
      name: nextName,
    });
  };

  const handleCopyToastTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    copyToastTouchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleCopyToastTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startY = copyToastTouchStartY.current;
    copyToastTouchStartY.current = null;
    const endY = event.changedTouches[0]?.clientY;
    if (startY == null || endY == null) return;
    if (startY - endY >= 36) {
      setCopyToastDismissing(true);
      window.setTimeout(() => {
        setCopyToast(null);
        setCopyToastDismissing(false);
      }, 220);
    }
  };

  const activeListMenuProject = listMenuOpenId
    ? mapped.find((project) => project.id === listMenuOpenId) ?? null
    : null;

  return (
    <>
      {viewMode === "list" && showAllProjects ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-[#E6EBF2] bg-white shadow-sm dark:border-[#3F3F3F] dark:bg-[#323232] dark:shadow-[0_1px_0_rgba(255,255,255,0.02)]">
          <div className="md:hidden">
            <div className="grid grid-cols-[36px_minmax(0,1fr)_40px] items-center gap-x-4 border-b border-[#E6EBF2] bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700 dark:border-[#3C3C3C] dark:bg-[#323232] dark:text-zinc-100">
              <button
                type="button"
                onClick={() => {
                  if (allVisibleSelected) {
                    setSelected((prev) => {
                      const next = { ...prev };
                      mapped.forEach((project) => {
                        delete next[project.id];
                      });
                      return next;
                    });
                    return;
                  }

                  setSelected((prev) => {
                    const next = { ...prev };
                    mapped.forEach((project) => {
                      next[project.id] = true;
                    });
                    return next;
                  });
                }}
                className={`inline-flex h-5 w-5 items-center justify-center rounded-[5px] border-2 transition ${
                  allVisibleSelected
                    ? "border-[#6C47FF] bg-[#6C47FF] text-white"
                    : "border-slate-300 text-transparent hover:border-slate-400 dark:border-[#4A4A4A]"
                }`}
                aria-label={allVisibleSelected ? "Deselect all projects" : "Select all projects"}
                aria-pressed={allVisibleSelected}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              </button>
              <span className="text-left">Name</span>
              <span aria-hidden />
            </div>
            <div className="divide-y divide-[#E6EBF2] dark:divide-[#3C3C3C]">
              {mapped.map((project) => {
                const isSelected = !!selected[project.id];
                const fileSize = formatFileSize(project.fileSizeBytes);
                const primaryMetaParts = [
                  "PDF",
                  fileSize,
                  typeof project.pagesCount === "number"
                    ? `${project.pagesCount} ${project.pagesCount === 1 ? "page" : "pages"}`
                    : null,
                ].filter(Boolean) as string[];

                return (
                  <div
                    key={project.id}
                    className={`relative grid grid-cols-[36px_minmax(0,1fr)_40px] items-start gap-x-4 px-4 py-3 transition ${
                      isSelected ? "bg-[#F5F3FF] dark:bg-[#3A3A3A]" : "hover:bg-[#F8FAFC] dark:hover:bg-[#3A3A3A]/70"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected((prev) => ({ ...prev, [project.id]: !prev[project.id] }))}
                      className={`mt-1 inline-flex h-5 w-5 items-center justify-center rounded-[5px] border-2 transition ${
                        isSelected
                          ? "border-[#6C47FF] bg-[#6C47FF] text-white"
                          : "border-slate-300 text-transparent hover:border-slate-400 dark:border-[#4A4A4A]"
                      }`}
                      aria-label={isSelected ? "Deselect project" : "Select project"}
                      aria-pressed={isSelected}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                    </button>
                    {listRenamingId === project.id ? (
                      <div className="flex min-w-0 items-center gap-2 pt-0.5">
                        <input
                          value={listRenameDraft}
                          autoFocus
                          spellCheck={false}
                          autoComplete="off"
                          disabled={listRenameBusy}
                          onChange={(event) => {
                            setListRenameDraft(event.target.value);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setListRenamingId(null);
                              setListRenameDraft("");
                              return;
                            }
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void submitListRename(project.id);
                            }
                          }}
                          onBlur={() => {
                            if (listRenameBusy) return;
                            setListRenamingId(null);
                            setListRenameDraft("");
                          }}
                          className="w-full rounded-md border-2 border-[#6C47FF]/55 bg-slate-50/70 px-2 py-1 text-[16px] font-semibold leading-tight text-slate-900 outline-none focus:border-[#6C47FF] focus:ring-0 disabled:opacity-70 dark:border-[#6C47FF]/65 dark:bg-[#323232]/60 dark:text-zinc-100"
                        />
                        <button
                          type="button"
                          aria-label="Confirm rename"
                          disabled={listRenameBusy}
                          onMouseDown={(event) => {
                            event.preventDefault();
                          }}
                          onClick={() => {
                            void submitListRename(project.id);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#6C47FF] transition hover:bg-[#F8FAFC] hover:text-[#5B38E6] disabled:opacity-60 dark:text-[#BBA6FF] dark:hover:bg-[#3A3A3A]/70 dark:hover:text-[#CFC4FF]"
                        >
                          <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1 pt-0.5">
                        <Link
                          href={`/studio?project=${encodeURIComponent(project.id)}`}
                          className={`block min-w-0 truncate text-[16px] font-semibold text-slate-900 dark:text-zinc-100 ${
                            renamedProjectId === project.id
                              ? "[animation:rename-text-flash_1400ms_ease-out_forwards]"
                              : ""
                          }`}
                        >
                          {project.title}
                        </Link>
                        <span className="mt-1 flex flex-wrap items-center gap-y-0.5 text-xs text-slate-500 dark:text-zinc-300">
                          <span className="whitespace-nowrap">{primaryMetaParts.join(" · ")}</span>
                          <span className="whitespace-nowrap before:mx-1 before:content-['·']">
                            {project.updated}
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="relative flex items-start justify-end pt-0.5">
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const nextOpen = listMenuOpenId !== project.id;
                          if (!nextOpen) {
                            closeListMenu();
                            return;
                          }
                          setListMenuAnimateIn(listMenuOpenId === null);
                          const trigger = event.currentTarget.getBoundingClientRect();
                          setListMenuPosition(getListMenuPosition(trigger));
                          setListMenuOpenId(project.id);
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                          listMenuOpenId === project.id
                            ? "bg-[#6C47FF] text-white"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
                        }`}
                        aria-label="Project actions"
                        aria-expanded={listMenuOpenId === project.id}
                        aria-haspopup="menu"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </button>
                      {listMenuOpenId === project.id && !isMobileListMenuViewport() ? (
                        <div
                          role="menu"
                          aria-label="Project actions"
                          className="project-actions-menu absolute right-[calc(100%+2px)] top-0 z-[120] w-64 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white text-sm text-slate-800 shadow-[0_16px_36px_rgba(15,23,42,0.14)] dark:border-[#3A3A3A] dark:bg-[#323232] dark:text-zinc-100 dark:shadow-[0_20px_44px_rgba(0,0,0,0.5)]"
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                          style={
                            isMobileListMenuViewport() && listMenuPosition
                              ? { top: `${listMenuPosition.top}px` }
                              : undefined
                          }
                        >
                          <div className="px-3 py-2.5">
                            {listMenuRenamingId === project.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  value={listRenameDraft}
                                  autoFocus
                                  spellCheck={false}
                                  autoComplete="off"
                                  disabled={listRenameBusy}
                                  onChange={(event) => {
                                    setListRenameDraft(event.target.value);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Escape") {
                                      event.preventDefault();
                                      setListMenuRenamingId(null);
                                      setListRenameDraft("");
                                      return;
                                    }
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      void submitListRename(project.id);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (listRenameBusy) return;
                                    setListMenuRenamingId(null);
                                    setListRenameDraft("");
                                  }}
                                  className="w-full rounded-md border-2 border-[#6C47FF]/55 bg-slate-50/70 px-2 py-1 text-sm font-semibold leading-tight text-slate-900 outline-none focus:border-[#6C47FF] focus:ring-0 disabled:opacity-70 dark:border-[#6C47FF]/65 dark:bg-[#323232]/60 dark:text-zinc-100"
                                />
                                <button
                                  type="button"
                                  aria-label="Confirm rename"
                                  disabled={listRenameBusy}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                  }}
                                  onClick={() => {
                                    void submitListRename(project.id);
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#6C47FF] transition hover:bg-[#F8FAFC] hover:text-[#5B38E6] disabled:opacity-60 dark:text-[#BBA6FF] dark:hover:bg-[#3A3A3A]/70 dark:hover:text-[#CFC4FF]"
                                >
                                  <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                                </button>
                              </div>
                            ) : (
                              <div className="group/menu-title inline-flex max-w-full items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    toggleProjectStar(project.id);
                                  }}
                                  className={`inline-flex h-5 w-5 flex-none items-center justify-center transition ${
                                    starredById[project.id]
                                      ? "text-amber-500 dark:text-amber-300"
                                      : "text-slate-300 hover:text-amber-400 dark:text-zinc-600 dark:hover:text-amber-300"
                                  }`}
                                  aria-label={starredById[project.id] ? "Unstar project" : "Star project"}
                                  aria-pressed={starredById[project.id] === true}
                                >
                                  <Star
                                    className={`h-4 w-4 ${starredById[project.id] ? "fill-current" : ""}`}
                                    aria-hidden
                                  />
                                </button>
                                <button
                                  type="button"
                                  className="max-w-[190px] truncate text-left text-sm font-semibold text-slate-900 transition hover:text-slate-700 dark:text-zinc-100 dark:hover:text-zinc-200"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setListMenuRenamingId(project.id);
                                    setListRenameDraft(projectNameToEditable(project.title));
                                  }}
                                >
                                  {project.title}
                                </button>
                                <button
                                  type="button"
                                  aria-label="Rename project"
                                  className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-md text-slate-500 transition hover:bg-[#F8FAFC] hover:text-slate-700 md:opacity-0 md:group-hover/menu-title:opacity-100 md:group-focus-within/menu-title:opacity-100 dark:text-zinc-200 dark:hover:bg-[#3A3A3A]/70 dark:hover:text-zinc-100"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setListMenuRenamingId(project.id);
                                    setListRenameDraft(projectNameToEditable(project.title));
                                  }}
                                >
                                  <Pencil className="h-4 w-4" aria-hidden />
                                </button>
                              </div>
                            )}
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-300">
                              {project.updated}
                            </p>
                          </div>
                          <div className="h-px bg-[#E6EBF2] dark:bg-[#2B2B2B]" />
                          <button
                            type="button"
                            role="menuitem"
                            className="mx-2 mt-1 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] dark:text-zinc-100 dark:hover:bg-[#3A3A3A]/70"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              closeListMenu();
                              window.open(
                                `/studio?project=${encodeURIComponent(project.id)}`,
                                "_blank",
                                "noopener,noreferrer"
                              );
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
                            className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] dark:text-zinc-100 dark:hover:bg-[#3A3A3A]/70"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setListMenuRenamingId(project.id);
                              setListRenameDraft(projectNameToEditable(project.title));
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
                            disabled={listMenuPrintingId === project.id}
                            aria-disabled={listMenuPrintingId === project.id}
                            className="mx-2 flex w-[calc(100%-1rem)] items-center justify-between rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:bg-[#3A3A3A]/70"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void handleListMenuPrint(project);
                            }}
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span className="flex h-5 w-5 items-center justify-center text-current">
                                {listMenuPrintingId === project.id ? (
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
                            className="mx-2 flex w-[calc(100%-1rem)] items-center justify-between rounded-lg px-2.5 py-2 text-left text-slate-500 opacity-55 transition disabled:cursor-not-allowed dark:text-zinc-300"
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
                            disabled={listMenuCopyingId === project.id}
                            className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:bg-[#3A3A3A]/70"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (listMenuCopyingId === project.id) return;
                              setListMenuCopyingId(project.id);
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
                                  if (!json?.project?.id) return;
                                  handleProjectCopied(json.project, project.id);
                                  closeListMenu();
                                } finally {
                                  setListMenuCopyingId(null);
                                }
                              })();
                            }}
                          >
                            <span className="flex h-5 w-5 items-center justify-center text-current">
                              {listMenuCopyingId === project.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : (
                                <Copy className="h-4 w-4" aria-hidden />
                              )}
                            </span>
                            <span className="text-[15px] font-medium text-slate-900 dark:text-zinc-100">Make a copy</span>
                          </button>
                          <div className="mx-2 my-1 h-px bg-[#E6EBF2] dark:bg-[#2B2B2B]" />
                          <button
                            type="button"
                            role="menuitem"
                            className="mx-2 mb-1.5 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-rose-700 transition hover:bg-rose-50 dark:hover:bg-[#3A3A3A]/60"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              closeListMenu();
                              setProjects((prev) =>
                                prev.filter((entry) => entry.id !== project.id)
                              );
                              const restoredProject: SummaryProject = {
                                id: project.id,
                                name: project.title,
                                updatedAt: new Date(),
                                pdfUrl: project.pdfUrl ?? null,
                                pagesCount: project.pagesCount ?? 0,
                                rotation: project.rotation ?? 0,
                                hasPreview: project.hasPreview ?? false,
                              };
                              setTrashToast({
                                ids: [project.id],
                                projects: [restoredProject],
                                label: `"${project.title}" moved to Trash`,
                              });
                              void fetch(
                                `/api/projects/${encodeURIComponent(project.id)}/trash`,
                                { method: "POST" }
                              );
                            }}
                          >
                            <span className="flex h-5 w-5 items-center justify-center text-rose-700">
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="text-[15px] font-semibold text-rose-700">Move to trash</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="hidden md:flex md:max-h-[calc(100vh-280px)] md:flex-col">
            <div className="z-10 grid grid-cols-[36px_20px_minmax(280px,1fr)_120px_96px_56px] items-center gap-x-3 border-b border-[#E6EBF2] bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700 dark:border-[#3C3C3C] dark:bg-[#323232] dark:text-zinc-100 xl:grid-cols-[36px_20px_minmax(420px,1fr)_180px_120px_72px] xl:gap-x-5 2xl:grid-cols-[36px_20px_minmax(560px,1fr)_208px_132px_84px] 2xl:gap-x-6">
              <button
                type="button"
                onClick={() => {
                  if (allVisibleSelected) {
                    setSelected((prev) => {
                      const next = { ...prev };
                      mapped.forEach((project) => {
                        delete next[project.id];
                      });
                      return next;
                    });
                    return;
                  }

                  setSelected((prev) => {
                    const next = { ...prev };
                    mapped.forEach((project) => {
                      next[project.id] = true;
                    });
                    return next;
                  });
                }}
                className={`inline-flex h-5 w-5 items-center justify-center rounded-[5px] border-2 transition ${
                  allVisibleSelected
                    ? "border-[#6C47FF] bg-[#6C47FF] text-white"
                    : "border-slate-300 text-transparent hover:border-slate-400 dark:border-[#4A4A4A]"
                }`}
                aria-label={allVisibleSelected ? "Deselect all projects" : "Select all projects"}
                aria-pressed={allVisibleSelected}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              </button>
              <span aria-hidden />
              <span className="text-left">Name</span>
              <span className="text-left">Opened</span>
              <span className="block w-full text-center">Pages</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="min-h-0 overflow-y-auto divide-y divide-[#E6EBF2] dark:divide-[#3C3C3C]">
              {mapped.map((project) => {
                const isSelected = !!selected[project.id];
                return (
                  <div
                    key={project.id}
                    className={`grid grid-cols-[36px_20px_minmax(280px,1fr)_120px_96px_56px] items-center gap-x-3 px-4 py-3 transition xl:grid-cols-[36px_20px_minmax(420px,1fr)_180px_120px_72px] xl:gap-x-5 2xl:grid-cols-[36px_20px_minmax(560px,1fr)_208px_132px_84px] 2xl:gap-x-6 ${
                      isSelected ? "bg-[#F5F3FF] dark:bg-[#3A3A3A]" : "hover:bg-[#F8FAFC] dark:hover:bg-[#3A3A3A]/70"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected((prev) => ({ ...prev, [project.id]: !prev[project.id] }))}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-[5px] border-2 transition ${
                        isSelected
                          ? "border-[#6C47FF] bg-[#6C47FF] text-white"
                          : "border-slate-300 text-transparent hover:border-slate-400 dark:border-[#4A4A4A]"
                      }`}
                      aria-label={isSelected ? "Deselect project" : "Select project"}
                      aria-pressed={isSelected}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                      </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleProjectStar(project.id);
                      }}
                      className={`inline-flex h-6 w-6 flex-none items-center justify-center transition ${
                        starredById[project.id]
                          ? "text-amber-500 dark:text-amber-300"
                          : "text-slate-300 hover:text-amber-400 dark:text-zinc-600 dark:hover:text-amber-300"
                      }`}
                      aria-label={starredById[project.id] ? "Unstar project" : "Star project"}
                      aria-pressed={starredById[project.id] === true}
                    >
                      <Star
                        className={`h-[18px] w-[18px] ${starredById[project.id] ? "fill-current" : ""}`}
                        aria-hidden
                      />
                    </button>
                    {listRenamingId === project.id ? (
                      <div className="flex min-w-0 items-center gap-2">
                        <input
                          value={listRenameDraft}
                          autoFocus
                          spellCheck={false}
                          autoComplete="off"
                          disabled={listRenameBusy}
                          onChange={(event) => {
                            setListRenameDraft(event.target.value);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setListRenamingId(null);
                              setListRenameDraft("");
                              return;
                            }
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void submitListRename(project.id);
                            }
                          }}
                          onBlur={() => {
                            if (listRenameBusy) return;
                            setListRenamingId(null);
                            setListRenameDraft("");
                          }}
                          className="w-full rounded-md border-2 border-[#6C47FF]/55 bg-slate-50/70 px-2 py-1 text-[16px] font-semibold leading-tight text-slate-900 outline-none focus:border-[#6C47FF] focus:ring-0 disabled:opacity-70 dark:border-[#6C47FF]/65 dark:bg-[#323232]/60 dark:text-zinc-100"
                        />
                        <button
                          type="button"
                          aria-label="Confirm rename"
                          disabled={listRenameBusy}
                          onMouseDown={(event) => {
                            event.preventDefault();
                          }}
                          onClick={() => {
                            void submitListRename(project.id);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#6C47FF] transition hover:bg-[#F8FAFC] hover:text-[#5B38E6] disabled:opacity-60 dark:text-[#BBA6FF] dark:hover:bg-[#3A3A3A]/70 dark:hover:text-[#CFC4FF]"
                        >
                          <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                        </button>
                      </div>
                    ) : (
                      <div className="group/rename flex min-w-0 items-center gap-2 rounded-lg py-1">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Link
                              href={`/studio?project=${encodeURIComponent(project.id)}`}
                              className={`block min-w-0 flex-1 truncate text-[16px] font-semibold text-slate-900 dark:text-zinc-100 ${
                                renamedProjectId === project.id
                                  ? "[animation:rename-text-flash_1400ms_ease-out_forwards]"
                                  : ""
                              }`}
                            >
                              {project.title}
                            </Link>
                            <button
                              type="button"
                              aria-label="Rename project"
                              onClick={() => {
                                setListRenamingId(project.id);
                                setListRenameDraft(projectNameToEditable(project.title));
                              }}
                              className="inline-flex h-6 w-6 flex-none items-center justify-center text-slate-500 transition hover:text-slate-700 md:opacity-0 md:group-hover/rename:opacity-100 md:group-focus-within/rename:opacity-100 dark:text-zinc-300 dark:hover:text-zinc-100"
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                          <span className="mt-0.5 block text-xs text-slate-500 dark:text-zinc-300">
                            {formatFileSize(project.fileSizeBytes)
                              ? `PDF · ${formatFileSize(project.fileSizeBytes)}`
                              : "PDF"}
                          </span>
                        </div>
                      </div>
                    )}
                    <span className="truncate text-left text-[15px] text-slate-600 dark:text-zinc-200">
                      {formatProjectActivityDate(
                        projects.find((entry) => entry.id === project.id)?.updatedAt ?? project.updated
                      )}
                    </span>
                    <span className="block w-full text-center text-[15px] text-slate-600 dark:text-zinc-200">
                      {`${project.pagesCount ?? 0} ${(project.pagesCount ?? 0) === 1 ? "page" : "pages"}`}
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const nextOpen = listMenuOpenId !== project.id;
                          if (!nextOpen) {
                            setListMenuOpenId(null);
                            setListMenuPosition(null);
                            setListMenuRenamingId(null);
                            return;
                          }
                          const trigger = event.currentTarget.getBoundingClientRect();
                          setListMenuPosition(getListMenuPosition(trigger));
                          setListMenuOpenId(project.id);
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                          listMenuOpenId === project.id
                            ? "bg-[#6C47FF] text-white"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
                        }`}
                        aria-label="Project actions"
                        aria-expanded={listMenuOpenId === project.id}
                        aria-haspopup="menu"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="recent-projects-grid projects-grid mt-2 grid w-full max-w-[1880px] items-start gap-4 sm:gap-6">
          {mapped.map((project, index) => {
          const isSelected = !!selected[project.id];
          return (
            <div
              key={project.id}
              className="w-full"
            >
              <ProjectCard
                project={project}
                isSelected={isSelected}
                hasSelection={hasSelection}
                starred={starredById[project.id] === true}
                showResumeBadge={showResumeBadge && sortOption === "activity" && index === 0}
                onToggleStar={(id, next) => {
                  setStarredById((prev) => {
                    let updated: Record<string, true>;
                    if (next) {
                      updated = { ...prev, [id]: true };
                    } else {
                      const copy: Record<string, true> = { ...prev };
                      delete copy[id];
                      updated = copy;
                    }
                    writeStarredToStorage(updated);
                    return updated;
                  });
                }}
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
                      hasPreview: duplicated.hasPreview ?? false,
                    };
                    const withoutNew = prev.filter((entry) => entry.id !== nextId);
                    const sourceIndex = withoutNew.findIndex((entry) => entry.id === sourceId);
                    if (sourceIndex === -1) return [nextEntry, ...withoutNew];
                    const next = [...withoutNew];
                    next.splice(sourceIndex + 1, 0, nextEntry);
                    return next;
                  });
                }}
                onTrashed={(trashedProject) => {
                  setProjects((prev) => prev.filter((entry) => entry.id !== trashedProject.id));
                  const restoredProject: SummaryProject = {
                    id: trashedProject.id,
                    name: trashedProject.title,
                    updatedAt: new Date(),
                    pdfUrl: trashedProject.pdfUrl ?? null,
                    pagesCount: trashedProject.pagesCount ?? 0,
                    rotation: trashedProject.rotation ?? 0,
                    hasPreview: trashedProject.hasPreview ?? false,
                  };
                  setTrashToast({
                    ids: [trashedProject.id],
                    projects: [restoredProject],
                    label: `"${trashedProject.title}" moved to Trash`,
                  });
                }}
              />
            </div>
          );
          })}
        </div>
      )}
      {mounted
        ? createPortal(
            <>
              <div
                className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-[80] flex justify-center px-4 transition-all duration-200 ease-out sm:bottom-10 lg:bottom-14 xl:bottom-18 sm:px-6 ${
                  hasSelection
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-3 opacity-0"
                }`}
              >
                <div className="flex w-[min(440px,calc(100vw-2rem))] min-h-16 items-center justify-between rounded-[18px] border-2 border-slate-300 bg-white px-4 py-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.10),0_18px_36px_rgba(15,23,42,0.12)] dark:border-[#3A3A3A] dark:bg-[#252525]">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelected({})}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-200 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
                      aria-label="Clear selection"
                    >
                      <X className="h-5 w-5" aria-hidden />
                    </button>
                    <span className="px-2.5 text-[15px] font-semibold text-slate-900 dark:text-zinc-100">
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
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-[#3A3A3A] dark:hover:text-zinc-100"
                      aria-label="Download selected projects"
                    >
                      <Download className="h-5 w-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmTrashOpen(true)}
                      disabled={bulkBusy !== null}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-[#3A3A3A] dark:hover:text-rose-400"
                      aria-label="Move selected projects to trash"
                    >
                      <Trash2 className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
              {confirmTrashOpen ? (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/25 px-4 backdrop-blur-[2px]">
                  <div className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-[0_20px_52px_rgba(15,23,42,0.24)] dark:bg-[#323232]">
                    <h3 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-zinc-100">
                      Send {selectedCount} {selectedCount === 1 ? "project" : "projects"} to Trash?
                    </h3>
                    <p className="mt-4 text-base font-medium text-slate-600 dark:text-zinc-200">
                      You can restore them from Trash for 30 days.
                    </p>
                    <div className="mt-7 flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setConfirmTrashOpen(false)}
                        className="rounded-xl border-2 border-slate-300 px-4 py-2 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-[#4A4A4A] dark:text-zinc-100 dark:hover:bg-[#3A3A3A]"
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
                  <div className="flex min-h-[132px] w-full max-w-[440px] flex-col justify-center rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-[0_20px_52px_rgba(15,23,42,0.24)] dark:border-[#3A3A3A] dark:bg-[#323232]">
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
              {typeof document !== "undefined" &&
              activeListMenuProject &&
              listMenuPosition
                ? createPortal(
                    <div
                      key={activeListMenuProject.id}
                      role="menu"
                      aria-label="Project actions"
                      className={`project-actions-menu fixed z-[9999] w-64 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white text-sm text-slate-800 shadow-[0_16px_36px_rgba(15,23,42,0.14)] dark:border-[#3A3A3A] dark:bg-[#323232] dark:text-zinc-100 dark:shadow-[0_20px_44px_rgba(0,0,0,0.5)] ${
                        listMenuAnimateIn ? "dropdown-pop-in" : ""
                      }`}
                      onMouseDown={(event) => {
                        event.stopPropagation();
                      }}
                      style={{ top: listMenuPosition.top, left: listMenuPosition.left }}
                    >
                      <div className="px-3 py-2.5">
                        {listMenuRenamingId === activeListMenuProject.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={listRenameDraft}
                              autoFocus
                              spellCheck={false}
                              autoComplete="off"
                              disabled={listRenameBusy}
                              onChange={(event) => {
                                setListRenameDraft(event.target.value);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  setListMenuRenamingId(null);
                                  setListRenameDraft("");
                                  return;
                                }
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void submitListRename(activeListMenuProject.id);
                                }
                              }}
                              onBlur={() => {
                                if (listRenameBusy) return;
                                setListMenuRenamingId(null);
                                setListRenameDraft("");
                              }}
                              className="w-full rounded-md border-2 border-[#6C47FF]/55 bg-slate-50/70 px-2 py-1 text-sm font-semibold leading-tight text-slate-900 outline-none focus:border-[#6C47FF] focus:ring-0 disabled:opacity-70 dark:border-[#6C47FF]/65 dark:bg-[#323232]/60 dark:text-zinc-100"
                            />
                            <button
                              type="button"
                              aria-label="Confirm rename"
                              disabled={listRenameBusy}
                              onMouseDown={(event) => {
                                event.preventDefault();
                              }}
                              onClick={() => {
                                void submitListRename(activeListMenuProject.id);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#6C47FF] transition hover:bg-[#F8FAFC] hover:text-[#5B38E6] disabled:opacity-60 dark:text-[#BBA6FF] dark:hover:bg-[#3A3A3A]/70 dark:hover:text-[#CFC4FF]"
                            >
                              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                            </button>
                          </div>
                        ) : (
                          <div className="group/menu-title inline-flex max-w-full items-center gap-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                toggleProjectStar(activeListMenuProject.id);
                              }}
                              className={`inline-flex h-5 w-5 flex-none items-center justify-center transition ${
                                starredById[activeListMenuProject.id]
                                  ? "text-amber-500 dark:text-amber-300"
                                  : "text-slate-300 hover:text-amber-400 dark:text-zinc-600 dark:hover:text-amber-300"
                              }`}
                              aria-label={starredById[activeListMenuProject.id] ? "Unstar project" : "Star project"}
                              aria-pressed={starredById[activeListMenuProject.id] === true}
                            >
                              <Star
                                className={`h-4 w-4 ${starredById[activeListMenuProject.id] ? "fill-current" : ""}`}
                                aria-hidden
                              />
                            </button>
                            <button
                              type="button"
                              className="max-w-[190px] truncate text-left text-sm font-semibold text-slate-900 transition hover:text-slate-700 dark:text-zinc-100 dark:hover:text-zinc-200"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setListMenuRenamingId(activeListMenuProject.id);
                                setListRenameDraft(projectNameToEditable(activeListMenuProject.title));
                              }}
                            >
                              {activeListMenuProject.title}
                            </button>
                            <button
                              type="button"
                              aria-label="Rename project"
                              className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-md text-slate-500 transition hover:bg-[#F8FAFC] hover:text-slate-700 md:opacity-0 md:group-hover/menu-title:opacity-100 md:group-focus-within/menu-title:opacity-100 dark:text-zinc-200 dark:hover:bg-[#3A3A3A]/70 dark:hover:text-zinc-100"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setListMenuRenamingId(activeListMenuProject.id);
                                setListRenameDraft(projectNameToEditable(activeListMenuProject.title));
                              }}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        )}
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-300">
                          {activeListMenuProject.updated}
                        </p>
                      </div>
                      <div className="h-px bg-[#E6EBF2] dark:bg-[#2B2B2B]" />
                      <button
                        type="button"
                        role="menuitem"
                        className="mx-2 mt-1 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] dark:text-zinc-100 dark:hover:bg-[#3A3A3A]/70"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setListMenuOpenId(null);
                          setListMenuPosition(null);
                          window.open(
                            `/studio?project=${encodeURIComponent(activeListMenuProject.id)}`,
                            "_blank",
                            "noopener,noreferrer"
                          );
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
                        className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] dark:text-zinc-100 dark:hover:bg-[#3A3A3A]/70"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setListMenuRenamingId(activeListMenuProject.id);
                          setListRenameDraft(projectNameToEditable(activeListMenuProject.title));
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
                        disabled={listMenuPrintingId === activeListMenuProject.id}
                        aria-disabled={listMenuPrintingId === activeListMenuProject.id}
                        className="mx-2 flex w-[calc(100%-1rem)] items-center justify-between rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:bg-[#3A3A3A]/70"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleListMenuPrint(activeListMenuProject);
                        }}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-5 w-5 items-center justify-center text-current">
                            {listMenuPrintingId === activeListMenuProject.id ? (
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
                        className="mx-2 flex w-[calc(100%-1rem)] items-center justify-between rounded-lg px-2.5 py-2 text-left text-slate-500 opacity-55 transition disabled:cursor-not-allowed dark:text-zinc-300"
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
                        disabled={listMenuCopyingId === activeListMenuProject.id}
                        className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-slate-900 transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:bg-[#3A3A3A]/70"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (listMenuCopyingId === activeListMenuProject.id) return;
                          setListMenuCopyingId(activeListMenuProject.id);
                          void (async () => {
                            try {
                              const res = await fetch(
                                `/api/projects/${encodeURIComponent(activeListMenuProject.id)}/copy`,
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
                              if (!json?.project?.id) return;
                              handleProjectCopied(json.project, activeListMenuProject.id);
                              setListMenuOpenId(null);
                              setListMenuPosition(null);
                            } finally {
                              setListMenuCopyingId(null);
                            }
                          })();
                        }}
                      >
                        <span className="flex h-5 w-5 items-center justify-center text-current">
                          {listMenuCopyingId === activeListMenuProject.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Copy className="h-4 w-4" aria-hidden />
                          )}
                        </span>
                        <span className="text-[15px] font-medium text-slate-900 dark:text-zinc-100">Make a copy</span>
                      </button>
                      <div className="mx-2 my-1 h-px bg-[#E6EBF2] dark:bg-[#2B2B2B]" />
                      <button
                        type="button"
                        role="menuitem"
                        className="mx-2 mb-1.5 flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-rose-700 transition hover:bg-rose-50 dark:hover:bg-[#3A3A3A]/60"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setListMenuOpenId(null);
                          setListMenuPosition(null);
                          setProjects((prev) =>
                            prev.filter((entry) => entry.id !== activeListMenuProject.id)
                          );
                          const restoredProject: SummaryProject = {
                            id: activeListMenuProject.id,
                            name: activeListMenuProject.title,
                            updatedAt: new Date(),
                            pdfUrl: activeListMenuProject.pdfUrl ?? null,
                            pagesCount: activeListMenuProject.pagesCount ?? 0,
                            rotation: activeListMenuProject.rotation ?? 0,
                            hasPreview: activeListMenuProject.hasPreview ?? false,
                          };
                          setTrashToast({
                            ids: [activeListMenuProject.id],
                            projects: [restoredProject],
                            label: `"${activeListMenuProject.title}" moved to Trash`,
                          });
                          void fetch(
                            `/api/projects/${encodeURIComponent(activeListMenuProject.id)}/trash`,
                            { method: "POST" }
                          );
                        }}
                      >
                        <span className="flex h-5 w-5 items-center justify-center text-rose-700">
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="text-[15px] font-semibold text-rose-700">Move to trash</span>
                      </button>
                    </div>,
                    document.body
                  )
                : null}
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
              {copyToast ? (
                <div
                  className={`fixed left-1/2 top-4 z-[10000] w-[min(420px,calc(100vw-1.5rem))] ${
                    copyToastDismissing
                      ? "[animation:copy-toast-dismiss-up_220ms_ease-out_forwards]"
                      : "[animation:copy-toast-in-out_6500ms_ease-in-out_forwards]"
                  }`}
                  onTouchStart={handleCopyToastTouchStart}
                  onTouchEnd={handleCopyToastTouchEnd}
                >
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
                </div>
              ) : null}
            </>,
            document.body
          )
        : null}
    </>
  );
}
