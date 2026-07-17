"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Combine,
  FileText,
  FileUp,
  Plus,
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
  renderedAt?: string | Date;
  showAllProjects?: boolean;
  showOwnerFilter?: boolean;
  showResumeBadge?: boolean;
  initialViewMode?: ViewMode;
};

type OwnerFilter = "any" | "shared" | "you";
type SortOption = "activity" | "starred" | "az" | "za";
type ViewMode = "grid" | "list";
const ALL_PROJECTS_QUICK_ACTIONS = [
  {
    title: "Merge PDFs",
    description: "Combine multiple PDFs into one document",
    icon: Combine,
    toneClass: "bg-[#6C47FF]/12 text-[#6C47FF] group-hover:bg-[#6C47FF]/16 group-hover:text-[#5B38E6] dark:bg-[#6C47FF]/15 dark:text-[#CBB8FF] dark:group-hover:bg-[#6C47FF]/20 dark:group-hover:text-white",
  },
  {
    title: "Split PDF",
    description: "Extract pages from a PDF",
    icon: Scissors,
    toneClass: "bg-[#14B8A6]/12 text-[#14B8A6] group-hover:bg-[#14B8A6]/16 group-hover:text-[#0F988C] dark:bg-[#14B8A6]/15 dark:text-[#8DE7DE] dark:group-hover:bg-[#14B8A6]/20 dark:group-hover:text-white",
  },
  {
    title: "Compress PDF",
    description: "Reduce PDF file size",
    icon: FileUp,
    toneClass: "bg-[#F97316]/12 text-[#F97316] group-hover:bg-[#F97316]/16 group-hover:text-[#E85C00] dark:bg-[#F97316]/15 dark:text-[#FEC49A] dark:group-hover:bg-[#F97316]/20 dark:group-hover:text-white",
  },
  {
    title: "Convert PDF",
    description: "Convert between PDF, Word, JPG, PNG",
    icon: ArrowLeftRight,
    toneClass: "bg-[#3B82F6]/12 text-[#3B82F6] group-hover:bg-[#3B82F6]/16 group-hover:text-[#2563EB] dark:bg-[#3B82F6]/15 dark:text-[#9CC3FF] dark:group-hover:bg-[#3B82F6]/20 dark:group-hover:text-white",
  },
  {
    title: "eSign Document",
    description: "Add or request signatures",
    icon: Signature,
    toneClass: "bg-[#EC4899]/12 text-[#EC4899] group-hover:bg-[#EC4899]/16 group-hover:text-[#DB2777] dark:bg-[#EC4899]/15 dark:text-[#F8A5C2] dark:group-hover:bg-[#EC4899]/20 dark:group-hover:text-white",
  },
  {
    title: "Templates",
    description: "Start from reusable templates",
    icon: FileText,
    toneClass: "bg-[#8B5CF6]/12 text-[#8B5CF6] group-hover:bg-[#8B5CF6]/16 group-hover:text-[#7C3AED] dark:bg-[#8B5CF6]/15 dark:text-[#D7C9FF] dark:group-hover:bg-[#8B5CF6]/20 dark:group-hover:text-white",
  },
  {
    title: "OCR PDF",
    description: "Extract searchable text",
    icon: ScanText,
    toneClass: "bg-[#22C55E]/12 text-[#22C55E] group-hover:bg-[#22C55E]/16 group-hover:text-[#16A34A] dark:bg-[#22C55E]/15 dark:text-[#9BE7AE] dark:group-hover:bg-[#22C55E]/20 dark:group-hover:text-white",
  },
  {
    title: "Batch Processing",
    description: "Process multiple files at once",
    icon: Workflow,
    toneClass: "bg-[#64748B]/12 text-[#64748B] group-hover:bg-[#64748B]/16 group-hover:text-[#475569] dark:bg-[#64748B]/15 dark:text-[#CBD5E1] dark:group-hover:bg-[#64748B]/20 dark:group-hover:text-white",
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
  renderedAt,
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
  const accountInitials = useMemo(() => {
    const parts = accountName.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : parts[0]?.[1] ?? "";
    const initials = `${first}${second}`.toUpperCase();
    return initials.length ? initials : "Y";
  }, [accountName]);


  const hasProjects = (projectsState.length ?? 0) > 0;
  const [sortOption, setSortOption] = useState<SortOption>("activity");
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [closeRowMenusTick, setCloseRowMenusTick] = useState(0);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("any");
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const ownerMenuRef = useRef<HTMLDivElement | null>(null);
  const [ownerSearch, setOwnerSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const recentListRef = useRef<HTMLDivElement | null>(null);
  const quickActionsTrackRef = useRef<HTMLDivElement | null>(null);
  const quickActionsFirstCardRef = useRef<HTMLButtonElement | null>(null);
  const quickActionsLastCardRef = useRef<HTMLButtonElement | null>(null);
  const [canScrollQuickActionsPrev, setCanScrollQuickActionsPrev] = useState(false);
  const [canScrollQuickActionsNext, setCanScrollQuickActionsNext] = useState(false);
  const [leftArrowMounted, setLeftArrowMounted] = useState(false);
  const [rightArrowMounted, setRightArrowMounted] = useState(false);

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

  useEffect(() => {
    if (!showAllProjects) return;
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("workspace-content-ready"));
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [showAllProjects]);

  useEffect(() => {
    if (!showAllProjects) return;

    const track = quickActionsTrackRef.current;
    if (!track) return;

    const measure = () => {
      const nextCanScrollPrev = track.scrollLeft > 4;
      const nextCanScrollNext = track.scrollLeft + track.clientWidth < track.scrollWidth - 4;

      setCanScrollQuickActionsPrev(nextCanScrollPrev);
      setCanScrollQuickActionsNext(nextCanScrollNext);
      setLeftArrowMounted(true);
      setRightArrowMounted(true);
    };

    measure();

    const handleScroll = () => {
      measure();
    };

    track.addEventListener('scroll', handleScroll, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    resizeObserver?.observe(track);

    window.addEventListener('resize', measure);

    return () => {
      track.removeEventListener('scroll', handleScroll);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [showAllProjects]);

  const scrollQuickActions = (direction: 'prev' | 'next') => {
    const track = quickActionsTrackRef.current;
    if (!track) return;

    const cards = Array.from(track.querySelectorAll<HTMLButtonElement>('[data-quick-action-card="true"]'));
    if (!cards.length) return;

    const cardWidth = cards[0]?.offsetWidth ?? 320;
    const computedStyles = window.getComputedStyle(track);
    const gap = Number.parseFloat(computedStyles.columnGap || computedStyles.gap || "0") || 0;
    const step = track.clientWidth < 768 ? 1 : 2;
    const currentLeft = track.scrollLeft + 4;
    let currentIndex = cards.findIndex((card) => card.offsetLeft + cardWidth + gap > currentLeft);
    if (currentIndex === -1) currentIndex = cards.length - 1;

    const targetIndex = direction === "next"
      ? Math.min(cards.length - 1, currentIndex + step)
      : Math.max(0, currentIndex - step);
    cards[targetIndex]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'start',
      block: 'nearest',
    });
  };

  if (showAllProjects) {

    return (
      <section className="flex w-full min-h-0 flex-1 flex-col">
        <div className={`flex h-full w-full flex-1 min-h-0 flex-col px-4 pt-2 sm:px-5 sm:pt-3 lg:px-7 xl:px-8 ${showAllProjects ? "max-w-none" : "mx-auto max-w-[1680px]"}`}> 
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-visible">

            <section className="shrink-0 space-y-4">
              <div className="relative">
                {leftArrowMounted && canScrollQuickActionsPrev ? (<div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-8 bg-gradient-to-r from-white via-white/90 to-transparent md:block dark:from-[#111111] dark:via-[#111111]/90" />) : null}
                {rightArrowMounted && canScrollQuickActionsNext ? (<div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-8 bg-gradient-to-l from-white via-white/90 to-transparent md:block dark:from-[#111111] dark:via-[#111111]/90" />) : null}
                <div className="pointer-events-none absolute inset-y-0 left-[-12px] right-[-12px] z-20 hidden items-center justify-between md:flex">
                  <button
                    type="button"
                    onClick={() => scrollQuickActions("prev")}
                    disabled={!canScrollQuickActionsPrev}
                    className={"pointer-events-auto absolute left-0 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#0F172A]/15 bg-white/95 text-[#1F2A37]  shadow-[0_18px_42px_rgba(15,23,42,0.24),0_2px_6px_rgba(15,23,42,0.10)] ring-1 ring-[#0F172A]/10 transition  " + (canScrollQuickActionsPrev ? "hover:border-[#0F172A]/25 hover:bg-white/95" : "opacity-0 pointer-events-none")}
                    aria-label="Scroll quick actions left"
                  >
                    <ChevronLeft className="relative z-10 h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollQuickActions("next")}
                    disabled={!canScrollQuickActionsNext}
                    className={"pointer-events-auto absolute right-0 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#0F172A]/15 bg-white/95 text-[#1F2A37]  shadow-[0_18px_42px_rgba(15,23,42,0.26),0_2px_6px_rgba(15,23,42,0.10)] ring-1 ring-[#0F172A]/10 transition  " + (canScrollQuickActionsNext ? "hover:border-[#0F172A]/25 hover:bg-white/95" : "opacity-0 pointer-events-none")}
                    aria-label="Scroll quick actions right"
                  >
                    <ChevronRight className="relative z-10 h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div
                  ref={quickActionsTrackRef}
                  className="relative z-0 flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 pr-12 pl-1 scroll-pl-4 md:pr-16 md:scroll-pl-16 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {ALL_PROJECTS_QUICK_ACTIONS.map(({ title, description, icon: Icon, toneClass }, index) => (
                    <button
                      key={title}
                      ref={index === 0 ? quickActionsFirstCardRef : index === ALL_PROJECTS_QUICK_ACTIONS.length - 1 ? quickActionsLastCardRef : undefined}
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new Event("open-create-project"));
                        }
                      }}
                      data-quick-action-card="true"
                      className="group relative flex min-h-[92px] w-full max-w-[280px] shrink-0 snap-start flex-none flex-col items-start justify-start gap-1.5 overflow-hidden rounded-[10px] border-2 border-[#D7DDE5] bg-[#F3F5F8] hover:border-[#C9D0D8] hover:bg-[#E8EBEF] dark:border-[#3F3F3F] dark:bg-[#F8F8F9] dark:hover:border-[#505050] dark:hover:bg-[#323232] p-2.5 text-left transition outline outline-0 outline-transparent shadow-[0_1px_0_rgba(15,23,42,0.015),0_6px_14px_rgba(15,23,42,0.035)] dark:shadow-[0_6px_14px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/20 sm:min-w-[250px] sm:max-w-[300px] lg:min-w-[260px] lg:max-w-[320px]"
                    >
                      <span className={"inline-flex h-9 w-9 items-center justify-center rounded-2xl transition " + toneClass}>
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="space-y-1">
                        <span className="block text-[14px] font-semibold text-[#1F2A37] dark:text-zinc-100">{title}</span>
                        <span className="block text-[12px] leading-4 text-slate-500 dark:text-zinc-400">{description}</span>
                      </span>
                      <span className="inline-flex w-fit text-xs font-medium tracking-tight text-[#6C47FF] underline-offset-4 transition group-hover:underline">
                        Start now
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b border-[#E6EBF2] bg-white dark:border-[#3F3F3F] dark:bg-[#252525]">
              <div className="flex flex-col gap-2.5 py-2.5 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="min-w-0 shrink-0 text-lg font-semibold tracking-tight text-[#1F2A37] dark:text-zinc-100 sm:text-xl lg:text-[1.375rem]">
                  Your projects
                </h2>
                <div className="flex min-w-0 flex-1 items-center gap-3 lg:justify-end">
                  <div
                    className="flex h-10 min-w-0 w-full flex-[0_1_440px] items-center gap-2 rounded-xl border border-[#E6EBF2] bg-white px-3 shadow-sm transition focus-within:border-2 focus-within:border-[#4F46E5] dark:border-[#3F3F3F] dark:bg-[#323232] dark:shadow-[0_8px_18px_rgba(0,0,0,0.12)] lg:max-w-[440px]"
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
                    <Search className="h-4.5 w-4.5 text-[#6B7280] dark:text-zinc-400" aria-hidden />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={query}
                      onChange={(event) => queryBridge?.setQuery(event.target.value)}
                      placeholder="Search projects, files, templates..."
                      className="h-full min-w-0 flex-1 border-none bg-transparent text-sm text-[#1F2A37] placeholder:text-[#6B7280] outline-none focus:outline-none focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="relative inline-flex items-center rounded-xl border border-[#E6EBF2] bg-white p-1 shadow-sm dark:border-[#3F3F3F] dark:bg-[#323232]">
                      <button
                        type="button"
                        onClick={() => setViewMode("grid")}
                        className={`inline-flex h-8 min-w-[46px] items-center justify-center rounded-lg px-2.5 text-xs font-semibold transition ${
                          viewMode === "grid"
                            ? "bg-[#E5E7EB] text-[#1F2A37] dark:bg-[#3A3A3A] dark:text-zinc-100"
                            : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        }`}
                        aria-label="Grid view"
                        aria-pressed={viewMode === "grid"}
                      >
                        <LayoutGrid className="mr-1.5 h-4 w-4" aria-hidden />
                        <span className="hidden min-[470px]:inline">Grid</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("list")}
                        className={`inline-flex h-8 min-w-[46px] items-center justify-center rounded-lg px-2.5 text-xs font-semibold transition ${
                          viewMode === "list"
                            ? "bg-[#E5E7EB] text-[#1F2A37] dark:bg-[#3A3A3A] dark:text-zinc-100"
                            : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        }`}
                        aria-label="List view"
                        aria-pressed={viewMode === "list"}
                      >
                        <List className="mr-1.5 h-4 w-4" aria-hidden />
                        <span className="hidden min-[470px]:inline">List</span>
                      </button>
                    </div>
                    <div ref={sortMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setSortMenuOpen((prev) => !prev)}
                        className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold text-[#1F2A37] shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/15 dark:text-zinc-100 dark:shadow-[0_8px_18px_rgba(0,0,0,0.12)] ${
                          sortMenuOpen
                            ? "border-[#CBD5E1] bg-gradient-to-b from-white to-[#F2F5FA] shadow-[0_14px_32px_rgba(15,23,42,0.14)] ring-1 ring-inset ring-[#D9E2F0] dark:border-[#565656] dark:from-[#414141] dark:to-[#343434] dark:shadow-[0_16px_30px_rgba(0,0,0,0.28)] dark:ring-white/10"
                            : "border-[#E6EBF2] bg-white hover:border-[#D8DEE8] hover:bg-[#E2E8F0] dark:border-[#3F3F3F] dark:bg-[#323232] dark:hover:border-[#4A4A4A] dark:hover:bg-[#2E2E2E]"
                        }`}
                        aria-haspopup="menu"
                        aria-expanded={sortMenuOpen}
                      >
                        {sortOption === "activity" ? (
                          <Clock
                            className={`h-4 w-4 transition-colors ${
                              sortMenuOpen ? "text-[#6C47FF] dark:text-[#CBB8FF]" : "text-current"
                            }`}
                            aria-hidden
                          />
                        ) : sortOption === "starred" ? (
                          <Star
                            className={`h-4 w-4 transition-colors ${
                              sortMenuOpen ? "text-[#6C47FF] dark:text-[#CBB8FF]" : "text-current"
                            }`}
                            aria-hidden
                          />
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
                        <ChevronDown
                          className={`h-4 w-4 transition-all ${sortMenuOpen ? "rotate-180 text-[#6C47FF] dark:text-[#CBB8FF]" : "text-current opacity-70"}`}
                          aria-hidden
                        />
                      </button>

                      {sortMenuOpen ? (
                        <div
                          role="menu"
                          className="project-actions-menu absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-1.5 text-sm text-slate-800 shadow-[0_16px_36px_rgba(15,23,42,0.14)] dark:border-[#3A3A3A] dark:bg-[#323232] dark:text-zinc-100 dark:shadow-[0_20px_44px_rgba(0,0,0,0.5)]"
                        >
                          <div className="space-y-1">
                            {([
                              { key: "activity", label: "Last activity", Icon: Clock },
                              { key: "starred", label: "Starred", Icon: Star },
                              { key: "az", label: "Name (A-Z)", Icon: ArrowUp },
                              { key: "za", label: "Name (Z-A)", Icon: ArrowDown },
                            ] as const).map(({ key, label, Icon }) => (
                              <button
                                key={key}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setSortOption(key);
                                  setSortMenuOpen(false);
                                }}
                                className={`project-actions-stagger-item flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                                  sortOption === key
                                    ? "bg-slate-100 dark:bg-[#3A3A3A]"
                                    : "hover:bg-slate-50 dark:hover:bg-[#3A3A3A]/70"
                                }`}
                              >
                                <span className="flex min-w-0 items-center gap-2.5 text-slate-900 dark:text-zinc-100">
                                  <Icon className="h-4 w-4 text-current" aria-hidden />
                                  <span className="truncate text-[15px] font-medium text-slate-900 dark:text-zinc-100">{label}</span>
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
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new Event("open-create-project"));
                        }
                      }}
                      className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border-2 border-[#5B38E6] bg-[#6C47FF] px-3.5 text-xs font-semibold text-white shadow-sm transition-[transform,background-color,box-shadow,border-color] duration-200 hover:-translate-y-[1px] hover:border-[#4A2ED0] hover:bg-[#5B38E6] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/15 dark:border-[#5B38E6] dark:bg-[#6C47FF] dark:text-zinc-100 dark:shadow-[0_8px_18px_rgba(0,0,0,0.12)] dark:hover:bg-[#5B38E6] dark:hover:shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
                    >
                      <Plus className="h-4.5 w-4.5" aria-hidden />
                      <span>New Project</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
              <div
                ref={recentListRef}
                data-projects-scroll-layer="true"
                className="recent-projects-container relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-transparent"
                style={{
                  paddingRight: 0,
                  paddingLeft: 0,
                  paddingBottom: 0,
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
                  renderedAt={renderedAt}
                  closeRowMenusTick={closeRowMenusTick}
                  onRowMenuOpen={() => setSortMenuOpen(false)}
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
      <section className="mt-0 flex w-full min-h-0 flex-1 flex-col">
          <div
          className={`box-border flex min-h-0 flex-1 flex-col rounded-xl border-[1.5px] border-gray-200 bg-white p-3 transition-[height] duration-300 ease-out shadow-sm dark:border-[#3F3F3F] dark:bg-[#323232] dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] md:p-4 ${
            showAllProjects ? "mt-3 sm:mt-4 md:mt-0" : ""
          }`}
          style={{ height: "calc(100% - var(--workspace-projects-bottom-gap, 0px))" }}
        >
          <div className="flex flex-row items-center justify-between gap-2 md:gap-4 md:pl-3">
            <h2 className="min-w-0 shrink-0 text-base font-semibold text-[#1F2A37] min-[560px]:text-lg dark:text-zinc-100 md:text-xl">
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
                  <div className="relative inline-flex items-center rounded-xl border border-[#E6EBF2] bg-white dark:border-[#3F3F3F] dark:bg-[#323232]">
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute left-0 top-0 h-full w-[48px] rounded-lg bg-[#E5E7EB] transition-[width,transform] duration-200 ease-out min-[470px]:w-[68px] dark:bg-[#3A3A3A] ${
                        viewMode === "grid"
                          ? "translate-x-0"
                          : "translate-x-[48px] min-[470px]:translate-x-[68px]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`relative z-10 inline-flex h-[34px] w-[48px] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition min-[470px]:w-[68px] ${
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
                      className={`relative z-10 inline-flex h-[34px] w-[48px] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition min-[470px]:w-[68px] ${
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
                      onClick={() => {
                        setSortMenuOpen((prev) => {
                          const next = !prev;
                          if (next) {
                            setCloseRowMenusTick((value) => value + 1);
                          }
                          return next;
                        });
                      }}
                      className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-semibold shadow-sm transition duration-200 min-[410px]:px-3 md:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/15 dark:shadow-[0_8px_18px_rgba(0,0,0,0.12)] ${
                        sortMenuOpen
                          ? "border-[#CBD5E1] bg-gradient-to-b from-white to-[#F2F5FA] text-[#1F2A37] shadow-[0_14px_32px_rgba(15,23,42,0.14)] ring-1 ring-inset ring-[#D9E2F0] dark:border-[#565656] dark:from-[#414141] dark:to-[#343434] dark:text-zinc-100 dark:shadow-[0_16px_30px_rgba(0,0,0,0.28)] dark:ring-white/10"
                          : "border-[#E6EBF2] bg-white text-[#1F2A37] hover:border-[#D8DEE8] hover:bg-[#E2E8F0] dark:border-[#3F3F3F] dark:bg-[#323232] dark:text-zinc-100 dark:hover:border-[#4A4A4A] dark:hover:bg-[#2E2E2E]"
                      }`}
                      aria-haspopup="menu"
                      aria-expanded={sortMenuOpen}
                    >
                      {sortOption === "activity" ? (
                        <Clock
                          className={`h-4 w-4 transition-colors ${
                            sortMenuOpen ? "text-[#6C47FF] dark:text-[#CBB8FF]" : "text-current"
                          }`}
                          aria-hidden
                        />
                      ) : sortOption === "starred" ? (
                        <Star
                          className={`h-4 w-4 transition-colors ${
                            sortMenuOpen ? "text-[#6C47FF] dark:text-[#CBB8FF]" : "text-current"
                          }`}
                          aria-hidden
                        />
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
                        className={`ml-1 h-4 w-4 transition-all ${
                          sortMenuOpen ? "rotate-180 text-[#6C47FF] dark:text-[#CBB8FF]" : "text-current opacity-70"
                        }`}
                        aria-hidden
                      />
                    </button>

                    {sortMenuOpen ? (
                      <div
                        role="menu"
                        className="project-actions-menu absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-1.5 text-sm text-slate-800 shadow-[0_16px_36px_rgba(15,23,42,0.14)] dark:border-[#3A3A3A] dark:bg-[#323232] dark:text-zinc-100 dark:shadow-[0_20px_44px_rgba(0,0,0,0.5)]"
                      >
                        <div className="space-y-1">
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
                              className={`project-actions-stagger-item flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                                sortOption === key
                                  ? "bg-slate-100 dark:bg-[#3A3A3A]"
                                  : "hover:bg-slate-50 dark:hover:bg-[#3A3A3A]/70"
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
                    className={`inline-flex items-center gap-2 rounded-xl border border-[#E6EBF2] px-4 py-2 text-xs font-semibold transition dark:border-[#3A3A3A] ${
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
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-[#2B2B2B] dark:text-zinc-200">
                                  <UserRound className="h-5 w-5" aria-hidden />
                                </span>
                              ),
                            },
                            {
                              key: "shared",
                              label: "Shared with you",
                              leading: (
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-[#2B2B2B] dark:text-zinc-200">
                                  <UsersRound className="h-5 w-5" aria-hidden />
                                </span>
                              ),
                            },
                            {
                              key: "you",
                              label: `${accountName} (You)`,
                              leading: (
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white dark:bg-[#3A3A3A]">
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
              showAllProjects ? "mt-2 sm:mt-3" : "mt-4 sm:mt-5"
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
              renderedAt={renderedAt}
            />
          </div>
          {!showAllProjects && hasProjects ? (
            <div className="mt-4 flex items-center">
              <Link
                href="/projects/all"
                className="inline-flex items-center rounded-xl border border-[#E6EBF2] px-4 py-2 text-xs font-semibold text-[#1F2A37] transition hover:border-[#D8DEE8] active:translate-y-[1px] active:scale-[0.98] active:bg-[#2563EB]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#51bdff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1F4F9] dark:border-[#3A3A3A] dark:text-zinc-100 dark:hover:border-[#4A4A4A] dark:active:bg-white/10 dark:focus-visible:ring-offset-[#252525]"
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
