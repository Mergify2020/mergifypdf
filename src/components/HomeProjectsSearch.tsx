"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  Combine,
  FileText,
  FileUp,
  List,
  LayoutGrid,
  Scissors,
  ScanText,
  Search,
  Signature,
  Star,
  UserRound,
  UsersRound,
  Workflow,
} from "lucide-react";
import RecentProjectsRow from "@/components/RecentProjectsRow";
import {
  getProjectsSummaryCache,
  setProjectsSummaryCache,
  subscribeProjectsSummary,
  type ProjectsSummaryProject,
} from "@/lib/projectsSummaryCache";
import { useWorkspaceHomeQuery } from "@/components/workspaceHomeQueryContext";

type SummaryProject = {
  id: string;
  name: string;
  updatedAt: string | Date;
  previewUrl?: string | null;
  pdfUrl?: string | null;
  pagesCount?: number | null;
  rotation?: number | null;
  hasPreview?: boolean;
  fileSizeBytes?: number | null;
};

type Props = {
  accountName: string;
  ownerKey?: string | null;
  projects: SummaryProject[];
  sectionLabel?: string;
  showAllProjects?: boolean;
  showOwnerFilter?: boolean;
  showResumeBadge?: boolean;
  initialViewMode?: ViewMode;
};

type OwnerFilter = "any" | "shared" | "you";
type SortOption = "activity" | "starred" | "az" | "za";
type ViewMode = "grid" | "list";
const ALL_PROJECTS_VIEW_MODE_KEY = "mpdf:all-projects-view-mode";

const ALL_PROJECTS_QUICK_ACTIONS = [
  {
    title: "Merge PDFs",
    description: "Combine multiple PDFs into one document",
    icon: Combine,
  },
  {
    title: "Split PDF",
    description: "Extract pages from a PDF",
    icon: Scissors,
  },
  {
    title: "Compress PDF",
    description: "Reduce PDF file size",
    icon: FileUp,
  },
  {
    title: "Convert PDF",
    description: "Convert between PDF, Word, JPG, PNG",
    icon: ArrowLeftRight,
  },
  {
    title: "eSign Document",
    description: "Add or request signatures",
    icon: Signature,
  },
  {
    title: "Templates",
    description: "Start from reusable templates",
    icon: FileText,
  },
  {
    title: "OCR PDF",
    description: "Extract searchable text",
    icon: ScanText,
  },
  {
    title: "Batch Processing",
    description: "Process multiple files at once",
    icon: Workflow,
  },
] as const;

const mapProjectsFromSummary = (
  projects: ProjectsSummaryProject[],
  fallback?: SummaryProject[]
): SummaryProject[] =>
  projects.map((project) => ({
    id: project.id,
    name: project.name?.trim() || "Untitled project",
    updatedAt:
      typeof project.updatedAt === "number" ? new Date(project.updatedAt) : project.updatedAt,
    previewUrl:
      project.previewUrl ??
      fallback?.find((item) => item.id === project.id)?.previewUrl ??
      null,
    pdfUrl: null,
    pagesCount: project.pagesCount ?? 0,
    rotation: project.rotation ?? 0,
    hasPreview: project.hasPreview ?? false,
    fileSizeBytes: project.fileSizeBytes ?? null,
  }));

const mapProjectsToSummary = (projects: SummaryProject[]): ProjectsSummaryProject[] =>
  projects.map((project) => ({
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    previewUrl: project.previewUrl ?? null,
    hasPreview: project.hasPreview ?? false,
    pagesCount: project.pagesCount ?? 0,
    rotation: project.rotation ?? 0,
    fileSizeBytes: project.fileSizeBytes ?? null,
  }));

export default function HomeProjectsSearch({
  accountName,
  ownerKey,
  projects,
  sectionLabel = "Recent projects",
  showAllProjects = false,
  showOwnerFilter = true,
  showResumeBadge = false,
  initialViewMode = "grid",
}: Props) {
  const queryBridge = useWorkspaceHomeQuery();
  const query = queryBridge?.query ?? "";
  const [projectsState, setProjectsState] = useState<SummaryProject[]>(projects);
  const [projectsLoading, setProjectsLoading] = useState(() => projects.length === 0);
  const initialProjects = useMemo(() => projectsState, [projectsState]);
  const hasProjects = (projectsState.length ?? 0) > 0;
  const [sortOption, setSortOption] = useState<SortOption>("activity");
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("any");
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const ownerMenuRef = useRef<HTMLDivElement | null>(null);
  const [ownerSearch, setOwnerSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const recentListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ownerKey) return;
    const cached = getProjectsSummaryCache(ownerKey);
    const nextProjects = cached ? mapProjectsFromSummary(cached, projects) : projects;
    const frame = window.requestAnimationFrame(() => {
      setProjectsState(nextProjects);
      setProjectsLoading(projects.length === 0 && !cached);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [ownerKey, projects]);

  useEffect(() => {
    if (!ownerKey) return;

    const routeProjectsSummary = mapProjectsToSummary(projects);

    if (showAllProjects) {
      const cached = getProjectsSummaryCache(ownerKey);
      if (!cached) {
        setProjectsSummaryCache(ownerKey, routeProjectsSummary);
      } else {
        const cachedIds = new Set(cached.map((project) => project.id));
        const hasNewIds = routeProjectsSummary.some((project) => !cachedIds.has(project.id));
        if (hasNewIds) {
          const merged = [
            ...routeProjectsSummary,
            ...cached.filter((project) => !routeProjectsSummary.some((item) => item.id === project.id)),
          ];
          setProjectsSummaryCache(ownerKey, merged);
        }
      }
    }

    const cached = getProjectsSummaryCache(ownerKey);

    // Seed shared cache from route payload, but avoid shrinking a fuller cached list.
    if (!cached) {
      setProjectsSummaryCache(ownerKey, routeProjectsSummary);
    } else {
      const cachedIds = new Set(cached.map((project) => project.id));
      const hasNewIds = routeProjectsSummary.some((project) => !cachedIds.has(project.id));
      if (hasNewIds) {
        const merged = [
          ...routeProjectsSummary,
          ...cached.filter((project) => !routeProjectsSummary.some((item) => item.id === project.id)),
        ];
        setProjectsSummaryCache(ownerKey, merged);
      }
    }

    const unsubscribe = subscribeProjectsSummary((update) => {
      if (update.ownerKey !== ownerKey || !update.projects) return;
      setProjectsState(mapProjectsFromSummary(update.projects, projects));
      setProjectsLoading(false);
    });

    const frame = window.requestAnimationFrame(() => {
      // The initial render can show a skeleton, but once the effect has synced
      // cached or route data we want the real empty state or project grid.
      setProjectsLoading(false);
    });

    return () => {
      unsubscribe();
      window.cancelAnimationFrame(frame);
    };
  }, [ownerKey, projects, showAllProjects]);

  const accountInitials = useMemo(() => {
    const parts = accountName
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : parts[0]?.[1] ?? "";
    const initials = `${first}${second}`.toUpperCase();
    return initials.length ? initials : "Y";
  }, [accountName]);
  const accountFirstName = useMemo(() => {
    const parts = accountName.trim().split(/\s+/).filter(Boolean);
    return parts[0] ?? accountName.trim() ?? "there";
  }, [accountName]);
  useEffect(() => {
    if (!sortMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setSortMenuOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSortMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [sortMenuOpen]);

  useEffect(() => {
    if (!ownerMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!ownerMenuRef.current?.contains(event.target as Node)) {
        setOwnerMenuOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOwnerMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [ownerMenuOpen]);

  useEffect(() => {
    if (!showAllProjects) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ALL_PROJECTS_VIEW_MODE_KEY, viewMode);
    document.cookie = `${ALL_PROJECTS_VIEW_MODE_KEY}=${viewMode}; path=/; max-age=31536000; samesite=lax`;
  }, [showAllProjects, viewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("workspace-content-ready"));
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  if (showAllProjects) {
    return (
      <section className="flex w-full min-h-0 flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1680px] flex-1 min-h-0 flex-col px-6 pb-8 pt-6 sm:px-8 sm:pb-10 lg:px-10 xl:px-12">
          <div className="space-y-8">
            <header className="space-y-3">
              <h1 className="text-[28px] font-semibold tracking-tight text-zinc-100 sm:text-[34px] lg:text-[40px]">
                Welcome back, {accountFirstName} 👋
              </h1>
              <p className="text-base font-medium text-zinc-300 sm:text-lg">What would you like to do today?</p>
              <p className="max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
                Merge, split, compress, convert, sign, and manage your PDF workflows.
              </p>
            </header>

            <div className="w-full max-w-[1480px]">
              <div className="flex h-14 w-full items-center gap-3 rounded-2xl border border-[#3A3A3A] bg-[#323232] px-4 shadow-[0_8px_24px_rgba(0,0,0,0.24)] transition focus-within:border-[#6C47FF] focus-within:shadow-[0_12px_32px_rgba(108,71,255,0.16)]">
                <Search className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(event) => queryBridge?.setQuery(event.target.value)}
                  placeholder="Search projects, files, templates..."
                  className="h-full min-w-0 flex-1 border-none bg-transparent text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl lg:text-2xl">Quick Actions</h2>
                  <p className="mt-1 text-sm text-zinc-400 sm:text-base">
                    Start a new workflow or jump into a common PDF task.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {ALL_PROJECTS_QUICK_ACTIONS.map(({ title, description, icon: Icon }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new Event("open-create-project"));
                      }
                    }}
                    className="group flex min-h-[140px] flex-col items-start justify-between rounded-2xl border border-[#3A3A3A] bg-[#323232] p-5 text-left shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition-all duration-200 hover:-translate-y-1 hover:border-[#5B38E6] hover:shadow-[0_16px_30px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/30"
                  >
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6C47FF]/15 text-[#CBB8FF] transition group-hover:bg-[#6C47FF]/20 group-hover:text-white">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="space-y-1">
                      <span className="block text-base font-semibold text-zinc-100">{title}</span>
                      <span className="block text-sm leading-6 text-zinc-400">{description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl lg:text-2xl">
                    Recent Projects
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400 sm:text-base">
                    {projectsState.length > 0
                      ? `${projectsState.length} ${projectsState.length === 1 ? "project" : "projects"}`
                      : "No recent projects yet."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative inline-flex items-center rounded-full border border-[#3F3F3F] bg-[#323232] p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`inline-flex h-9 min-w-[56px] items-center justify-center rounded-full px-3 text-xs font-semibold transition ${
                        viewMode === "grid"
                          ? "bg-[#E5E7EB] text-slate-700 dark:bg-[#3A3A3A] dark:text-zinc-100"
                          : "text-zinc-400 hover:text-zinc-100"
                      }`}
                      aria-label="Grid view"
                      aria-pressed={viewMode === "grid"}
                    >
                      <LayoutGrid className="mr-1.5 h-4 w-4" aria-hidden />
                      Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`inline-flex h-9 min-w-[56px] items-center justify-center rounded-full px-3 text-xs font-semibold transition ${
                        viewMode === "list"
                          ? "bg-[#E5E7EB] text-slate-700 dark:bg-[#3A3A3A] dark:text-zinc-100"
                          : "text-zinc-400 hover:text-zinc-100"
                      }`}
                      aria-label="List view"
                      aria-pressed={viewMode === "list"}
                    >
                      <List className="mr-1.5 h-4 w-4" aria-hidden />
                      List
                    </button>
                  </div>
                  <div ref={sortMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setSortMenuOpen((prev) => !prev)}
                      className={`inline-flex h-11 items-center gap-2 rounded-full border border-[#3F3F3F] px-4 text-xs font-semibold transition ${
                        sortMenuOpen
                          ? "bg-[#3A3A3A] text-zinc-100"
                          : "bg-[#323232] text-zinc-100 hover:border-[#4A4A4A]"
                      }`}
                      aria-haspopup="menu"
                      aria-expanded={sortMenuOpen}
                    >
                      {sortOption === "activity" ? (
                        <Clock className="h-4 w-4" aria-hidden />
                      ) : sortOption === "starred" ? (
                        <Star className="h-4 w-4" aria-hidden />
                      ) : null}
                      <span className="whitespace-nowrap">
                        {sortOption === "activity"
                          ? "Last activity"
                          : sortOption === "starred"
                            ? "Starred"
                            : sortOption === "az"
                              ? "Name (A-Z)"
                              : "Name (Z-A)"}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${sortMenuOpen ? "rotate-180" : ""}`} aria-hidden />
                    </button>

                    {sortMenuOpen ? (
                      <div
                        role="menu"
                        className="project-actions-menu absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#3F3F3F] bg-[#323232] text-sm text-zinc-100 shadow-[0_16px_36px_rgba(0,0,0,0.35)]"
                      >
                        {([
                          { value: "activity", label: "Last activity", icon: Clock },
                          { value: "starred", label: "Starred", icon: Star },
                          { value: "az", label: "Name (A-Z)", icon: ArrowUp },
                          { value: "za", label: "Name (Z-A)", icon: ArrowDown },
                        ] as const).map((option) => {
                          const OptionIcon = option.icon;
                          const active = sortOption === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setSortOption(option.value);
                                setSortMenuOpen(false);
                              }}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                                active ? "bg-[#3A3A3A]" : "hover:bg-[#2B2B2B]"
                              }`}
                            >
                              <OptionIcon className="h-4 w-4 text-zinc-300" aria-hidden />
                              <span className="flex-1">{option.label}</span>
                              {active ? <Check className="h-4 w-4 text-[#CBB8FF]" aria-hidden /> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div
                ref={recentListRef}
                data-projects-scroll-layer="true"
                className="recent-projects-container relative flex min-h-0 w-full flex-1 flex-col overflow-visible"
                style={{
                  paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
                  scrollbarGutter: "stable",
                  WebkitOverflowScrolling: "touch",
                  touchAction: "pan-y",
                }}
              >
                <RecentProjectsRow
                  initialProjects={initialProjects}
                  loading={projectsLoading}
                  query={query}
                  ownerFilter={ownerFilter}
                  sortOption={sortOption}
                  viewMode={viewMode}
                  showAllProjects={showAllProjects}
                  showResumeBadge={showResumeBadge}
                />
              </div>
            </section>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>

            <section className={`mt-0 flex w-full min-h-0 flex-1 flex-col ${showAllProjects ? "px-6 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6 lg:px-10 xl:px-12" : ""}`}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-row items-center justify-between gap-3 md:gap-4 md:pl-0">
            {showAllProjects ? (
              <div className="flex min-w-0 flex-1">
                <div
                  className="flex h-11 w-full cursor-text rounded-full border-[1.5px] border-gray-200 bg-white shadow-sm transition focus-within:border-[3.5px] focus-within:border-[#4F46E5] dark:border-[#3A3A3A] dark:bg-[#323232] dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] dark:focus-within:border-[#4F46E5]"
                  onMouseDown={(event) => {
                    const target = event.target;
                    if (target instanceof HTMLInputElement) return;
                    event.preventDefault();
                    searchInputRef.current?.focus();
                  }}
                  onClick={() => {
                    searchInputRef.current?.focus();
                  }}
                >
                  <div className="flex h-full w-full items-center gap-2 rounded-full bg-white px-4 text-[#1F2A37] dark:bg-[#323232] dark:text-zinc-100">
                    <Search className="h-5 w-5 text-[#6B7280] dark:text-zinc-400" aria-hidden />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={query}
                      onChange={(event) => queryBridge?.setQuery(event.target.value)}
                      placeholder="Search projects..."
                      className="h-full min-w-0 flex-1 border-none bg-white text-base text-[#1F2A37] placeholder:text-[#6B7280] outline-none focus:outline-none focus:ring-0 dark:bg-[#323232] dark:text-zinc-100 dark:placeholder:text-zinc-400"
                    />
                  </div>
                </div>
              </div>
            ) : null}
            <h2 className={showAllProjects ? "hidden" : "min-w-0 shrink-0 text-lg font-semibold text-[#1F2A37] min-[560px]:text-xl dark:text-zinc-100 md:text-2xl"}>
              {query.trim() ? (
                "Search results"
              ) : (
                <span>
                  {sectionLabel} <span className="text-slate-500 dark:text-zinc-400">({projectsState.length})</span>
                </span>
              )}
            </h2>
            <div className="flex min-w-0 shrink items-center justify-end gap-1.5 md:gap-2">
              {showAllProjects ? (
                <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                  <div className="relative inline-flex items-center rounded-full border-2 border-[#E6EBF2] bg-white dark:border-[#3F3F3F] dark:bg-[#323232]">
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute left-0 top-0 h-full w-[48px] rounded-full bg-[#E5E7EB] transition-[width,transform] duration-200 ease-out min-[470px]:w-[68px] dark:bg-[#3A3A3A] ${
                        viewMode === "grid"
                          ? "translate-x-0"
                          : "translate-x-[48px] min-[470px]:translate-x-[68px]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`relative z-10 inline-flex h-[34px] w-[48px] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition min-[470px]:w-[68px] ${
                        viewMode === "grid"
                          ? "text-slate-700 dark:text-[#F4F4F5]"
                          : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      }`}
                      aria-label="Grid view"
                      aria-pressed={viewMode === "grid"}
                    >
                      <LayoutGrid className="h-4.5 w-4.5" aria-hidden />
                      <span className="hidden min-[470px]:inline">Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`relative z-10 inline-flex h-[34px] w-[48px] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition min-[470px]:w-[68px] ${
                        viewMode === "list"
                          ? "text-slate-700 dark:text-[#F4F4F5]"
                          : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      }`}
                      aria-label="List view"
                      aria-pressed={viewMode === "list"}
                    >
                      <List className="h-4.5 w-4.5" aria-hidden />
                      <span className="hidden min-[470px]:inline">List</span>
                    </button>
                  </div>
                  <div ref={sortMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setSortMenuOpen((prev) => !prev)}
                      className={`inline-flex items-center gap-2 rounded-full border-2 px-2.5 py-2 text-xs font-semibold transition min-[410px]:px-3 md:px-4 ${
                        sortMenuOpen
                          ? "border-[#E6EBF2] bg-[#E5E7EB] text-[#1F2A37] dark:border-[#3F3F3F] dark:bg-[#3A3A3A] dark:text-zinc-100"
                          : "border-[#E6EBF2] bg-white text-[#1F2A37] hover:border-[#D8DEE8] dark:border-[#3F3F3F] dark:bg-[#323232] dark:text-zinc-100 dark:hover:border-[#4A4A4A]"
                      }`}
                      aria-haspopup="menu"
                      aria-expanded={sortMenuOpen}
                    >
                      {sortOption === "activity" ? (
                        <Clock className="h-4 w-4" aria-hidden />
                      ) : sortOption === "starred" ? (
                        <Star className="h-4 w-4" aria-hidden />
                      ) : null}
                      {sortOption === "az" || sortOption === "za" ? (
                        <span className="whitespace-nowrap min-[450px]:hidden">
                          {sortOption === "az" ? "A-Z" : "Z-A"}
                        </span>
                      ) : null}
                      <span className="hidden whitespace-nowrap min-[450px]:inline">
                        {sortOption === "activity"
                          ? "Last activity"
                          : sortOption === "starred"
                            ? "Starred"
                          : sortOption === "az"
                            ? "Name (A-Z)"
                            : "Name (Z-A)"}
                      </span>
                      <ChevronDown
                        className={`ml-1 h-4 w-4 opacity-70 transition-transform ${
                          sortMenuOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>

                    {sortMenuOpen ? (
                      <div
                        role="menu"
                        className="project-actions-menu absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#1F2A37] shadow-[0_16px_36px_rgba(15,23,42,0.14)] dark:border-[#3F3F3F] dark:bg-[#323232] dark:text-zinc-100 dark:shadow-[0_20px_44px_rgba(0,0,0,0.5)]"
                      >
                        <div className="pb-1.5 pt-1.5">
                          {(
                            [
                              { key: "activity", label: "Last activity", Icon: Clock },
                              { key: "starred", label: "Starred", Icon: Star },
                              { key: "az", label: "Name (A-Z)", Icon: ArrowUp },
                              { key: "za", label: "Name (Z-A)", Icon: ArrowDown },
                            ] as const
                          ).map(({ key, label, Icon }) => (
                            <button
                              key={key}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setSortOption(key);
                                setSortMenuOpen(false);
                              }}
                              className={`project-actions-stagger-item mx-2 flex w-[calc(100%-1rem)] items-center justify-between rounded-lg px-2.5 py-2 text-left transition ${
                                sortOption === key
                                  ? "bg-[#F8FAFC] dark:bg-[#3A3A3A]/70"
                                  : "hover:bg-[#F8FAFC] dark:hover:bg-[#3A3A3A]/60"
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2.5 text-slate-900 dark:text-zinc-100">
                                <Icon
                                  className="h-4 w-4 text-current"
                                  aria-hidden
                                />
                                <span className="truncate text-[15px] font-medium text-slate-900 dark:text-zinc-100">
                                  {label}
                                </span>
                              </span>
                              {sortOption === key ? (
                                <Check className="h-5 w-5 text-slate-900 dark:text-zinc-100" aria-hidden />
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {showOwnerFilter ? (
                <div ref={ownerMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOwnerMenuOpen((prev) => {
                        const next = !prev;
                        if (next) setOwnerSearch("");
                        return next;
                      });
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border-2 border-[#E6EBF2] px-4 py-2 text-xs font-semibold transition dark:border-[#3A3A3A] ${
                      ownerMenuOpen
                        ? "bg-[#009DFD] text-white dark:bg-[#E5E5E5] dark:text-[#1F1F1F]"
                        : "bg-white text-[#1F2A37] hover:border-[#D8DEE8] dark:bg-[#323232] dark:text-zinc-100 dark:hover:border-[#4A4A4A]"
                    }`}
                    aria-haspopup="menu"
                    aria-expanded={ownerMenuOpen}
                  >
                    <span className="max-w-[160px] truncate">
                      {ownerFilter === "any"
                        ? "Any owner"
                        : ownerFilter === "shared"
                          ? "Shared with you"
                          : `${accountName} (You)`}
                    </span>
                    <ChevronDown className="ml-1 h-4 w-4 opacity-70" aria-hidden />
                  </button>

                  {ownerMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 z-50 mt-3 w-[320px] overflow-hidden rounded-3xl border border-[#E6EBF2] bg-white text-sm text-[#1F2A37] dark:border-[#3A3A3A] dark:bg-[#323232] dark:text-zinc-100"
                    >
                      <div className="p-4 pb-3">
                        <div className="flex items-center gap-3 rounded-2xl border border-[#E6EBF2] bg-white px-4 py-3 dark:border-[#3A3A3A] dark:bg-[#323232]/60">
                        <Search className="h-5 w-5 text-[#009DFD] dark:text-[#B0B0B0]" aria-hidden />
                          <input
                            type="text"
                            value={ownerSearch}
                            onChange={(event) => setOwnerSearch(event.target.value)}
                            placeholder="Search people"
                            className="w-full border-none bg-transparent text-sm text-[#1F2A37] placeholder:text-[#6B7280] focus:outline-none focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                          />
                        </div>
                      </div>

                      <div className="pb-3">
                        {(
                          [
                            {
                              key: "any",
                              label: "Any owner",
                              leading: (
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-[#2B2B2B] dark:text-zinc-200">
                                  <UserRound className="h-5 w-5" aria-hidden />
                                </span>
                              ),
                            },
                            {
                              key: "shared",
                              label: "Shared with you",
                              leading: (
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-[#2B2B2B] dark:text-zinc-200">
                                  <UsersRound className="h-5 w-5" aria-hidden />
                                </span>
                              ),
                            },
                            {
                              key: "you",
                              label: `${accountName} (You)`,
                              leading: (
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white dark:bg-[#3A3A3A]">
                                  {accountInitials}
                                </span>
                              ),
                            },
                          ] as const
                        )
                          .filter((option) => {
                            const q = ownerSearch.trim().toLowerCase();
                            if (!q) return true;
                            return option.label.toLowerCase().includes(q);
                          })
                          .map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOwnerFilter(option.key);
                                setOwnerMenuOpen(false);
                              }}
                              className={`mx-3 flex w-[calc(100%-1.5rem)] items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                                ownerFilter === option.key
                                  ? "bg-slate-100 dark:bg-[#2B2B2B]/70"
                                  : "hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                {option.leading}
                                <span className="truncate text-base font-medium text-[#1F2A37] dark:text-zinc-100">{option.label}</span>
                              </span>
                              {ownerFilter === option.key ? (
                                <Check className="h-6 w-6 text-[#1F2A37] dark:text-zinc-100" aria-hidden />
                              ) : null}
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>




          <div
            ref={recentListRef}
            data-projects-scroll-layer="true"
            className={`recent-projects-container mt-0 h-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain ${
              showAllProjects ? "mt-3 sm:mt-4" : "mt-5 sm:mt-6"
            } relative`}
            style={{
              paddingRight: showAllProjects ? 12 : 4,
              paddingLeft: 4,
              paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
              scrollbarGutter: "stable",
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
            }}
          >
            <RecentProjectsRow
              initialProjects={initialProjects}
              loading={projectsLoading}
              query={query}
              ownerFilter={ownerFilter}
              sortOption={sortOption}
              viewMode={viewMode}
              showAllProjects={showAllProjects}
              showResumeBadge={showResumeBadge}
            />
          </div>
          {!showAllProjects && hasProjects ? (
            <div className="mt-4 flex items-center">
              <Link
                href="/projects/all"
                className="inline-flex items-center rounded-full border-2 border-[#E6EBF2] px-4 py-2 text-xs font-semibold text-[#1F2A37] transition hover:border-[#D8DEE8] active:translate-y-[1px] active:scale-[0.98] active:bg-[#2563EB]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#51bdff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1F4F9] dark:border-[#3A3A3A] dark:text-zinc-100 dark:hover:border-[#4A4A4A] dark:active:bg-white/10 dark:focus-visible:ring-offset-[#252525]"
              >
                View all projects
              </Link>
            </div>
          ) : null}
        </div>
      </section>

    </>
  );
}
