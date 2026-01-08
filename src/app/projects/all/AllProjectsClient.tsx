"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowDown, ArrowUp, Check, ChevronDown, Clock, Search, UserRound, UsersRound } from "lucide-react";
import AllProjectsGrid from "@/components/AllProjectsGrid";
import ContainerShadowOverlay from "@/components/ContainerShadowOverlay";
import StartProjectButton from "@/components/StartProjectButton";
import {
  getProjectsSummaryCache,
  refreshProjectsSummary,
  setProjectsSummaryCache,
  type ProjectsSummaryProject,
} from "@/lib/projectsSummaryCache";
import { matchesSearch } from "@/lib/search";
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
  updatedAtMs: number;
  previewUrl?: string | null;
  pagesCount?: number;
};

function mapSummaryProjects(projects: ProjectsSummaryProject[]): ProjectCard[] {
  return projects.map((project) => {
    const updatedAt =
      project.updatedAt instanceof Date ? project.updatedAt : new Date(project.updatedAt);

    return {
      id: project.id,
      title: project.name?.trim() || "Untitled project",
      updated: formatProjectLastEdited(updatedAt),
      updatedAtMs: updatedAt.getTime(),
      previewUrl: project.previewUrl ?? null,
      pagesCount: project.pagesCount ?? 0,
    };
  });
}

export default function AllProjectsClient() {
  const { data: session } = useSession();
  const ownerKey = session?.user?.id ?? session?.user?.email ?? null;
  const accountName = session?.user?.name ?? session?.user?.email ?? "You";
  // Important: keep initial render deterministic for SSR hydration.
  // Read caches only after mount.
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [sortOption, setSortOption] = useState<"activity" | "az" | "za">("activity");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<"any" | "shared" | "you">("any");
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const ownerMenuRef = useRef<HTMLDivElement | null>(null);
  const [ownerSearch, setOwnerSearch] = useState("");

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

  const filteredProjects = useMemo(() => {
    const trimmed = query.trim();
    const visibleProjects = ownerFilter === "shared" ? [] : projects;
    const searched = trimmed
      ? visibleProjects.filter((project) => matchesSearch(project.title, trimmed))
      : visibleProjects;
    const sorted = [...searched].sort((a, b) => {
      if (sortOption === "activity") return (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0);
      const aTitle = (a.title ?? "").trim().toLowerCase();
      const bTitle = (b.title ?? "").trim().toLowerCase();
      const cmp = aTitle.localeCompare(bTitle);
      return sortOption === "az" ? cmp : -cmp;
    });
    return sorted;
  }, [ownerFilter, projects, query, sortOption]);

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
    if (typeof window === "undefined") return;

    let cancelled = false;

    const load = async () => {
      try {
        if (ownerKey) {
          const cached = getProjectsSummaryCache(ownerKey);
          if (cached && !cancelled) {
            setProjects(mapSummaryProjects(cached));
            setLoading(false);
          }
        }

        const res = await fetch("/api/projects?summary=1", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { projects?: ApiProject[] };
        if (!Array.isArray(data.projects) || cancelled) return;

        const mapped = mapSummaryProjects(data.projects as ProjectsSummaryProject[]);

        if (!cancelled) {
          setProjects(mapped);
          if (ownerKey) {
            setProjectsSummaryCache(ownerKey, data.projects as ProjectsSummaryProject[]);
          }
          setLoading(false);
        }
      } catch {
        // On error, leave projects as-is; page can show an empty state.
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [ownerKey]);

  if (loading) {
    return (
      <main className="min-h-screen w-full bg-slate-100 px-2 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        <div
          id="all-projects-container"
          className="relative z-40 mx-auto mb-6 flex min-h-[calc(100vh-4rem)] w-full flex-col rounded-[32px] border border-slate-200/70 bg-white px-4 pb-12 pt-14 shadow-[0_18px_50px_rgba(15,23,42,0.10)] data-[shadow-overlay=true]:border-transparent data-[shadow-overlay=true]:shadow-none sm:mb-8 sm:px-6 lg:px-10"
        >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-[32px] bg-gradient-to-r from-slate-900/5 to-transparent"
            />
            <div className="home-hero-header">
              <h1 className="all-projects-title text-center font-semibold tracking-tight text-[#013d63]">
                All Projects
              </h1>
            </div>
            <div className="mt-5 flex justify-center">
              <div className="w-full max-w-4xl">
                <div
                  className="flex cursor-text items-center rounded-[999px] border-[3px] border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm transition hover:border-[#51bdff] hover:bg-slate-50 sm:px-6 sm:py-5"
                  onMouseDown={(event) => {
                    const target = event.target;
                    if (target instanceof HTMLInputElement) return;
                    event.preventDefault();
                  }}
                >
                  <Search className="h-5 w-5 text-[#008ade] sm:h-6 sm:w-6" aria-hidden />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    disabled
                    placeholder="Search projects and documents"
                    className="ml-3 min-w-0 flex-1 border-none bg-transparent text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:ml-4 sm:text-xl disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Projects (0)</h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
              <div ref={sortMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-full border-[3px] px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    sortMenuOpen
                      ? "border-[#51bdff] bg-[#008ade] text-white shadow-[0_14px_40px_rgba(15,23,42,0.18)]"
                      : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={sortMenuOpen}
                >
                  {sortOption === "activity" ? (
                    <Clock className="h-4 w-4" aria-hidden />
                  ) : sortOption === "az" ? (
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  ) : (
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  )}
                  <span className="whitespace-nowrap">
                    {sortOption === "activity"
                      ? "Last activity"
                      : sortOption === "az"
                        ? "Alphabetical (A-Z)"
                        : "Alphabetical (Z-A)"}
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4 opacity-70" aria-hidden />
                </button>

                {sortMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute left-0 z-50 mt-3 w-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-white text-sm text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.20)]"
                  >
                    <div className="pb-3 pt-2">
                      {(
                        [
                          { key: "activity", label: "Last activity", Icon: Clock },
                          { key: "az", label: "Alphabetical (A-Z)", Icon: ArrowUp },
                          { key: "za", label: "Alphabetical (Z-A)", Icon: ArrowDown },
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
                          className={`mx-3 flex w-[calc(100%-1.5rem)] items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                            sortOption === key ? "bg-slate-100" : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                              <Icon className="h-5 w-5" aria-hidden />
                            </span>
                            <span className="truncate text-base font-medium text-slate-900">{label}</span>
                          </span>
                          {sortOption === key ? <Check className="h-6 w-6 text-slate-900" aria-hidden /> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

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
                  className={`inline-flex items-center gap-2 rounded-full border-[3px] px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    ownerMenuOpen
                      ? "border-[#51bdff] bg-[#008ade] text-white shadow-[0_14px_40px_rgba(15,23,42,0.18)]"
                      : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
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
                    className="absolute right-0 z-50 mt-3 w-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-white text-sm text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.20)]"
                  >
                    <div className="p-4 pb-3">
                      <div className="flex items-center gap-3 rounded-2xl border-[3px] border-slate-300 bg-white px-4 py-3 shadow-sm">
                        <Search className="h-5 w-5 text-[#008ade]" aria-hidden />
                        <input
                          type="text"
                          value={ownerSearch}
                          onChange={(event) => setOwnerSearch(event.target.value)}
                          placeholder="Search people"
                          className="w-full border-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
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
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                                <UserRound className="h-5 w-5" aria-hidden />
                              </span>
                            ),
                          },
                          {
                            key: "shared",
                            label: "Shared with you",
                            leading: (
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                                <UsersRound className="h-5 w-5" aria-hidden />
                              </span>
                            ),
                          },
                          {
                            key: "you",
                            label: `${accountName} (You)`,
                            leading: (
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white">
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
                              ownerFilter === option.key ? "bg-slate-100" : "hover:bg-slate-50"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              {option.leading}
                              <span className="truncate text-base font-medium text-slate-900">{option.label}</span>
                            </span>
                            {ownerFilter === option.key ? <Check className="h-6 w-6 text-slate-900" aria-hidden /> : null}
                          </button>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
              </div>
            </div>
            <div className="projects-grid mt-10 grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 sm:gap-6">
              {Array.from({ length: 18 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[10px] bg-white/60 p-3 shadow-sm ring-1 ring-slate-200/60"
                >
                  <div className="relative m-[3px] aspect-[1.23/1] w-[calc(100%-6px)] overflow-hidden rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-[#EEF1F5]">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-4 w-3/4 rounded-full skeleton-shimmer" />
                    <div className="h-3.5 w-1/2 rounded-full skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        <ContainerShadowOverlay targetId="all-projects-container" overlayZIndex={45} />
      </main>
    );
  }

  if (!loading && projects.length === 0) {
    return (
      <main className="min-h-screen w-full bg-slate-100 px-2 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        <div
          id="all-projects-container"
          className="relative z-40 mx-auto mb-6 flex min-h-[calc(100vh-4rem)] w-full flex-col rounded-[32px] border border-slate-200/70 bg-white px-4 pb-12 pt-14 shadow-[0_18px_50px_rgba(15,23,42,0.10)] data-[shadow-overlay=true]:border-transparent data-[shadow-overlay=true]:shadow-none sm:mb-8 sm:px-6 lg:px-10"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-[32px] bg-gradient-to-r from-slate-900/5 to-transparent"
          />
          <div className="home-hero-header">
            <h1 className="all-projects-title text-center font-semibold tracking-tight text-[#013d63]">
              All Projects
            </h1>
          </div>
            <div className="mt-5 flex justify-center">
              <div className="w-full max-w-4xl">
                <div
                  className="flex cursor-text items-center rounded-[999px] border-[3px] border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm transition hover:border-[#51bdff] hover:bg-slate-50 sm:px-6 sm:py-5"
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
                  <Search className="h-5 w-5 text-[#008ade] sm:h-6 sm:w-6" aria-hidden />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search projects and documents"
                    className="ml-3 min-w-0 flex-1 border-none bg-transparent text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:ml-4 sm:text-xl"
                  />
                </div>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Projects (0)</h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
              <div ref={sortMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-full border-[3px] px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    sortMenuOpen
                      ? "border-[#51bdff] bg-[#008ade] text-white shadow-[0_14px_40px_rgba(15,23,42,0.18)]"
                      : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={sortMenuOpen}
                >
                  {sortOption === "activity" ? (
                    <Clock className="h-4 w-4" aria-hidden />
                  ) : sortOption === "az" ? (
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  ) : (
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  )}
                  <span className="whitespace-nowrap">
                    {sortOption === "activity"
                      ? "Last activity"
                      : sortOption === "az"
                        ? "Alphabetical (A-Z)"
                        : "Alphabetical (Z-A)"}
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4 opacity-70" aria-hidden />
                </button>

                {sortMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute left-0 z-50 mt-3 w-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-white text-sm text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.20)]"
                  >
                    <div className="pb-3 pt-2">
                      {(
                        [
                          { key: "activity", label: "Last activity", Icon: Clock },
                          { key: "az", label: "Alphabetical (A-Z)", Icon: ArrowUp },
                          { key: "za", label: "Alphabetical (Z-A)", Icon: ArrowDown },
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
                          className={`mx-3 flex w-[calc(100%-1.5rem)] items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                            sortOption === key ? "bg-slate-100" : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                              <Icon className="h-5 w-5" aria-hidden />
                            </span>
                            <span className="truncate text-base font-medium text-slate-900">{label}</span>
                          </span>
                          {sortOption === key ? <Check className="h-6 w-6 text-slate-900" aria-hidden /> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

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
                  className={`inline-flex items-center gap-2 rounded-full border-[3px] px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    ownerMenuOpen
                      ? "border-[#51bdff] bg-[#008ade] text-white shadow-[0_14px_40px_rgba(15,23,42,0.18)]"
                      : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
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
                    className="absolute right-0 z-50 mt-3 w-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-white text-sm text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.20)]"
                  >
                    <div className="p-4 pb-3">
                      <div className="flex items-center gap-3 rounded-2xl border-[3px] border-slate-300 bg-white px-4 py-3 shadow-sm">
                        <Search className="h-5 w-5 text-[#008ade]" aria-hidden />
                        <input
                          type="text"
                          value={ownerSearch}
                          onChange={(event) => setOwnerSearch(event.target.value)}
                          placeholder="Search people"
                          className="w-full border-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
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
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                                <UserRound className="h-5 w-5" aria-hidden />
                              </span>
                            ),
                          },
                          {
                            key: "shared",
                            label: "Shared with you",
                            leading: (
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                                <UsersRound className="h-5 w-5" aria-hidden />
                              </span>
                            ),
                          },
                          {
                            key: "you",
                            label: `${accountName} (You)`,
                            leading: (
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white">
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
                              ownerFilter === option.key ? "bg-slate-100" : "hover:bg-slate-50"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              {option.leading}
                              <span className="truncate text-base font-medium text-slate-900">{option.label}</span>
                            </span>
                            {ownerFilter === option.key ? <Check className="h-6 w-6 text-slate-900" aria-hidden /> : null}
                          </button>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
              </div>
            </div>

	            <div className="mt-6">
	              <div className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-[24px] border-[3px] border-dashed border-[#51bdff] bg-white/70 px-8 py-12 text-center shadow-sm">
	                <p className="text-lg font-semibold text-slate-900 sm:text-xl">No projects yet</p>
	                <p className="mt-2 max-w-sm text-sm text-slate-600 sm:text-base">Start a new project to see it here.</p>
	                <StartProjectButton
	                  variant="custom"
                  className="mt-8 inline-flex h-12 w-full max-w-sm items-center justify-center whitespace-nowrap rounded-[14px] border-[3px] border-[#51bdff] bg-[#008ade] px-6 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:bg-[#007fcd] hover:shadow-[0_18px_50px_rgba(15,23,42,0.32)] sm:h-14 sm:px-8 sm:text-base xl:text-lg"
                />
              </div>
            </div>
          </div>
        <ContainerShadowOverlay targetId="all-projects-container" overlayZIndex={45} />
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-slate-100 px-2 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <div
        id="all-projects-container"
        className="relative z-40 mx-auto mb-6 flex min-h-[calc(100vh-4rem)] w-full flex-col rounded-[32px] border border-slate-200/70 bg-white px-4 pb-12 pt-14 shadow-[0_18px_50px_rgba(15,23,42,0.10)] data-[shadow-overlay=true]:border-transparent data-[shadow-overlay=true]:shadow-none sm:mb-8 sm:px-6 lg:px-10"
      >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-[32px] bg-gradient-to-r from-slate-900/5 to-transparent"
          />
          <div className="home-hero-header">
            <h1 className="all-projects-title text-center font-semibold tracking-tight text-[#013d63]">
              All Projects
            </h1>
          </div>
          <div className="mt-5 flex justify-center">
            <div className="w-full max-w-4xl">
              <div
                className="flex cursor-text items-center rounded-[999px] border-[3px] border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm transition hover:border-[#51bdff] hover:bg-slate-50 sm:px-6 sm:py-5"
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
                <Search className="h-5 w-5 text-[#008ade] sm:h-6 sm:w-6" aria-hidden />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search projects and documents"
                  className="ml-3 min-w-0 flex-1 border-none bg-transparent text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:ml-4 sm:text-xl"
                />
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Projects ({filteredProjects.length})
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
            <div ref={sortMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setSortMenuOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-full border-[3px] px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  sortMenuOpen
                    ? "border-[#51bdff] bg-[#008ade] text-white shadow-[0_14px_40px_rgba(15,23,42,0.18)]"
                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                }`}
                aria-haspopup="menu"
                aria-expanded={sortMenuOpen}
              >
                {sortOption === "activity" ? (
                  <Clock className="h-4 w-4" aria-hidden />
                ) : sortOption === "az" ? (
                  <ArrowUp className="h-4 w-4" aria-hidden />
                ) : (
                  <ArrowDown className="h-4 w-4" aria-hidden />
                )}
                <span className="whitespace-nowrap">
                  {sortOption === "activity"
                    ? "Last activity"
                    : sortOption === "az"
                      ? "Alphabetical (A-Z)"
                      : "Alphabetical (Z-A)"}
                </span>
                <ChevronDown className="ml-1 h-4 w-4 opacity-70" aria-hidden />
              </button>

              {sortMenuOpen ? (
                <div
                  role="menu"
                  className="absolute left-0 z-50 mt-3 w-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-white text-sm text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.20)]"
                >
                  <div className="pb-3 pt-2">
                    {(
                      [
                        { key: "activity", label: "Last activity", Icon: Clock },
                        { key: "az", label: "Alphabetical (A-Z)", Icon: ArrowUp },
                        { key: "za", label: "Alphabetical (Z-A)", Icon: ArrowDown },
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
                        className={`mx-3 flex w-[calc(100%-1.5rem)] items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                          sortOption === key ? "bg-slate-100" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <span className="truncate text-base font-medium text-slate-900">{label}</span>
                        </span>
                        {sortOption === key ? <Check className="h-6 w-6 text-slate-900" aria-hidden /> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

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
                className={`inline-flex items-center gap-2 rounded-full border-[3px] px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  ownerMenuOpen
                    ? "border-[#51bdff] bg-[#008ade] text-white shadow-[0_14px_40px_rgba(15,23,42,0.18)]"
                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
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
                  className="absolute right-0 z-50 mt-3 w-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-white text-sm text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.20)]"
                >
                  <div className="p-4 pb-3">
                    <div className="flex items-center gap-3 rounded-2xl border-[3px] border-slate-300 bg-white px-4 py-3 shadow-sm">
                      <Search className="h-5 w-5 text-[#008ade]" aria-hidden />
                      <input
                        type="text"
                        value={ownerSearch}
                        onChange={(event) => setOwnerSearch(event.target.value)}
                        placeholder="Search people"
                        className="w-full border-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
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
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                              <UserRound className="h-5 w-5" aria-hidden />
                            </span>
                          ),
                        },
                        {
                          key: "shared",
                          label: "Shared with you",
                          leading: (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                              <UsersRound className="h-5 w-5" aria-hidden />
                            </span>
                          ),
                        },
                        {
                          key: "you",
                          label: `${accountName} (You)`,
                          leading: (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white">
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
                            ownerFilter === option.key ? "bg-slate-100" : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            {option.leading}
                            <span className="truncate text-base font-medium text-slate-900">{option.label}</span>
                          </span>
                          {ownerFilter === option.key ? <Check className="h-6 w-6 text-slate-900" aria-hidden /> : null}
                        </button>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
            </div>
          </div>
          <AllProjectsGrid
            projects={filteredProjects}
            onProjectTrashed={(id) => {
              setProjects((prev) => prev.filter((project) => project.id !== id));
            }}
            onProjectRenamed={(id, title) => {
              setProjects((prev) =>
                prev.map((project) => (project.id === id ? { ...project, title } : project))
              );
            }}
            onProjectCopied={(duplicated, sourceId) => {
              const nextId = duplicated.id;
              const nextTitle = duplicated.name?.trim() || "Untitled project";
              const updatedAt = duplicated.updatedAt ?? new Date();
              const nextCard: ProjectCard = {
                id: nextId,
                title: nextTitle,
                updated: formatProjectLastEdited(updatedAt),
                updatedAtMs: new Date(updatedAt).getTime(),
                previewUrl: duplicated.previewUrl ?? null,
                pagesCount: duplicated.pagesCount ?? 0,
              };
              setProjects((prev) => {
                const withoutNew = prev.filter((project) => project.id !== nextId);
                const sourceIndex = withoutNew.findIndex((project) => project.id === sourceId);
                if (sourceIndex === -1) return [nextCard, ...withoutNew];
                const next = [...withoutNew];
                next.splice(sourceIndex + 1, 0, nextCard);
                return next;
              });
            }}
          />
          {!loading && projects.length > 0 && filteredProjects.length === 0 ? (
            <p className="mt-12 text-center text-sm font-semibold text-slate-500 sm:text-base">
              No projects match &quot;{query.trim()}&quot;.
            </p>
          ) : null}
        </div>
      <ContainerShadowOverlay targetId="all-projects-container" overlayZIndex={45} />
    </main>
  );
}
