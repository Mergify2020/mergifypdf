"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  Moon,
  Search,
  Sparkles,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react";
import RecentProjectsRow from "@/components/RecentProjectsRow";
import SettingsMenu from "@/components/SettingsMenu";

type SummaryProject = {
  id: string;
  name: string;
  updatedAt: string | Date;
  pdfUrl?: string | null;
  pagesCount?: number | null;
  rotation?: number | null;
  hasPreview?: boolean;
};

type Props = {
  firstName: string;
  accountName: string;
  accountEmail?: string | null;
  projects: SummaryProject[];
  headline?: string;
  sectionLabel?: string;
  hideHeadline?: boolean;
  showAllProjects?: boolean;
  showOwnerFilter?: boolean;
  showResumeBadge?: boolean;
};

type OwnerFilter = "any" | "shared" | "you";
type SortOption = "activity" | "az" | "za";

const measureScrollbarWidth = () => {
  if (typeof document === "undefined") return 0;
  const outer = document.createElement("div");
  outer.style.visibility = "hidden";
  outer.style.overflow = "scroll";
  outer.style.width = "100px";
  outer.style.position = "absolute";
  outer.style.top = "-9999px";
  document.body.appendChild(outer);
  const inner = document.createElement("div");
  inner.style.width = "100%";
  outer.appendChild(inner);
  const width = outer.offsetWidth - inner.offsetWidth;
  outer.remove();
  return width;
};

export default function HomeProjectsSearch({
  firstName,
  accountName,
  accountEmail,
  projects,
  headline,
  sectionLabel = "Recent projects",
  hideHeadline = false,
  showAllProjects = false,
  showOwnerFilter = true,
  showResumeBadge = false,
}: Props) {
  const [query, setQuery] = useState("");
  const initialProjects = useMemo(() => projects, [projects]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("activity");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("any");
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const ownerMenuRef = useRef<HTMLDivElement | null>(null);
  const [ownerSearch, setOwnerSearch] = useState("");
  const heroBlockRef = useRef<HTMLDivElement | null>(null);
  const recentCardRef = useRef<HTMLDivElement | null>(null);
  const recentListRef = useRef<HTMLDivElement | null>(null);
  const syncRecentHeightRef = useRef<(() => void) | null>(null);
  const [recentHasOverflow, setRecentHasOverflow] = useState(false);
  const [recentScrollbarWidth, setRecentScrollbarWidth] = useState(0);
  const [forceStableScrollbar, setForceStableScrollbar] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

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
    const root = document.documentElement;
    const updateOffset = () => {
      const node = heroBlockRef.current;
      if (!node) return;
      const height = Math.round(node.getBoundingClientRect().height);
      const gap = 24;
      root.style.setProperty("--home-section-gap", `${gap}px`);
      root.style.setProperty("--home-right-column-offset", `${height + gap}px`);
      syncRecentHeightRef.current?.();
    };

    updateOffset();
    window.addEventListener("resize", updateOffset);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateOffset) : null;
    if (observer && heroBlockRef.current) {
      observer.observe(heroBlockRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateOffset);
      if (observer) observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const card = recentCardRef.current;
    if (!card) return;

    const updateHeight = () => {
      const cardRect = card.getBoundingClientRect();
      const sidebar = document.getElementById("home-sidebar");
      const sidebarBottom = sidebar?.getBoundingClientRect().bottom;
      const viewportBottom = window.innerHeight - 24;
      const targetBottom = typeof sidebarBottom === "number" ? sidebarBottom : viewportBottom;
      const nextHeight = Math.max(0, Math.round(targetBottom - cardRect.top));
      card.style.height = `${nextHeight}px`;
    };

    const updateWithRaf = () => {
      window.requestAnimationFrame(updateHeight);
    };

    syncRecentHeightRef.current = updateWithRaf;
    updateWithRaf();
    window.addEventListener("resize", updateWithRaf);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateWithRaf) : null;
    if (observer) {
      observer.observe(card);
      const sidebar = document.getElementById("home-sidebar");
      if (sidebar) observer.observe(sidebar);
    }

    return () => {
      syncRecentHeightRef.current = null;
      window.removeEventListener("resize", updateWithRaf);
      if (observer) observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const width = measureScrollbarWidth();
    if (width > 0) setRecentScrollbarWidth(width);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const list = recentListRef.current;
    if (!list) return;
    let raf = 0;
    let clearTimer: number | null = null;
    const lastColumnsRef = { current: "" };
    const lastChangeRef = { current: 0 };

    const updateColumns = () => {
      const grid = list.querySelector(".projects-grid");
      if (!grid) return;
      const computed = window.getComputedStyle(grid);
      const columns = computed.gridTemplateColumns;
      if (columns !== lastColumnsRef.current) {
        const now = Date.now();
        if (lastColumnsRef.current && now - lastChangeRef.current < 250) {
          setForceStableScrollbar(true);
          if (clearTimer) window.clearTimeout(clearTimer);
          clearTimer = window.setTimeout(() => {
            setForceStableScrollbar(false);
          }, 800);
        }
        lastColumnsRef.current = columns;
        lastChangeRef.current = now;
      }
    };

    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateColumns);
    };

    schedule();
    window.addEventListener("resize", schedule);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (observer) observer.observe(list);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (clearTimer) window.clearTimeout(clearTimer);
      window.removeEventListener("resize", schedule);
      if (observer) observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const list = recentListRef.current;
    if (!list) return;
    let raf = 0;

    const updateOverflow = () => {
      const overflowAmount = list.scrollHeight - list.clientHeight;
      const scrollbarWidth = list.offsetWidth - list.clientWidth;
      if (scrollbarWidth > 0) {
        setRecentScrollbarWidth(scrollbarWidth);
      }
      setRecentHasOverflow((prev) => {
        if (overflowAmount > 12) return true;
        if (overflowAmount < 4) return false;
        return prev;
      });
    };

    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateOverflow);
    };

    schedule();
    window.addEventListener("resize", schedule);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (observer) observer.observe(list);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      if (observer) observer.disconnect();
    };
  }, [query, ownerFilter, sortOption, initialProjects]);


  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("theme");
    const initialTheme = stored === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    document.body.classList.remove("dark");
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.add("theme-transition");
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    if (nextTheme === "light") {
      document.body.classList.remove("dark");
    }
    window.localStorage.setItem("theme", nextTheme);
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000`;
    setTheme(nextTheme);
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 200);
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <>
      <section className="pt-0">
        <div
          ref={heroBlockRef}
          className="flex w-full flex-col"
          style={{ gap: "var(--home-section-gap, 24px)" }}
        >
          <div className="flex w-full items-center justify-between gap-3 lg:mr-[-304px] lg:w-[calc(100%+304px)]">
            <div className={`flex flex-1 items-center ${hideHeadline ? "gap-0" : "gap-6"}`}>
              {!hideHeadline ? (
                <p className="whitespace-nowrap text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2563EB] dark:text-zinc-200 dark:bg-none">
                  {headline ?? `Hello, ${firstName}`}
                </p>
              ) : null}
              <div className={`flex w-full items-center ${hideHeadline ? "gap-3" : "gap-6"}`}>
                <div className={`flex w-full ${hideHeadline ? "max-w-xl" : "max-w-sm"}`}>
                  <div
                    className="flex h-11 w-full cursor-text rounded-full border border-[#E5E7EB] bg-transparent p-[1px] shadow-[12px_0_36px_rgba(15,23,42,0.10)] focus-within:border-transparent focus-within:bg-gradient-to-r focus-within:from-[#009DFD] focus-within:to-[#4F46E5] dark:border-zinc-700 dark:bg-zinc-900/60 dark:shadow-[12px_0_36px_rgba(0,0,0,0.45)] dark:focus-within:from-zinc-700 dark:focus-within:to-zinc-600"
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
                    <div className="flex h-full w-full items-center gap-2 rounded-full bg-white px-4 text-[#1F2A37] [--search-gradient-start:#009DFD] [--search-gradient-end:#4F46E5] dark:bg-zinc-900 dark:text-zinc-100 dark:[--search-gradient-start:#e4e4e7] dark:[--search-gradient-end:#a1a1aa]">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="url(#searchGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <defs>
                          <linearGradient id="searchGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--search-gradient-start)" />
                            <stop offset="100%" stopColor="var(--search-gradient-end)" />
                          </linearGradient>
                        </defs>
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search projects..."
                        className="h-full min-w-0 flex-1 border-none bg-white text-sm text-[#1F2A37] placeholder:text-[#6B7280] outline-none focus:outline-none focus:ring-0 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 sm:text-base"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#1F2A37] shadow-[12px_0_36px_rgba(15,23,42,0.10)] transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[12px_0_36px_rgba(0,0,0,0.45)] dark:hover:bg-zinc-800"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-pressed={theme === "dark"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
              </button>
              <div className="flex h-11 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white py-1.5 pl-1 pr-1.5 shadow-[12px_0_36px_rgba(15,23,42,0.10)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[12px_0_36px_rgba(0,0,0,0.45)]">
                <div className="shrink-0">
                  <SettingsMenu />
                </div>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="max-w-[220px] truncate text-[13px] font-semibold text-[#1F2A37] dark:text-zinc-100">
                    {accountName}
                  </span>
                  {accountEmail ? (
                    <span className="max-w-[220px] truncate text-[11px] font-medium text-[#64748B] dark:text-zinc-400">
                      {accountEmail}
                    </span>
                  ) : null}
                </span>
                <ChevronDown className="h-4 w-4 text-[#94A3B8] dark:text-zinc-400" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 w-full">
        <div
          ref={recentCardRef}
          className="flex min-h-0 flex-col rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)] sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-[#1F2A37] dark:text-zinc-100 sm:text-lg">
              {query.trim() ? "Search results" : sectionLabel}
            </h2>
            <div className="flex items-center gap-2">
              <div ref={sortMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-full border-2 border-[#E6EBF2] px-4 py-2 text-xs font-semibold transition dark:border-zinc-700 ${
                    sortMenuOpen
                      ? "bg-[var(--color-primary-light)] text-[#1F2A37] ring-2 ring-[rgba(37,99,235,0.18)] dark:text-zinc-100"
                      : "bg-white text-[#1F2A37] hover:border-[#D8DEE8] dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
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
                    className="absolute left-0 top-full z-50 mt-2 min-w-full w-max overflow-hidden rounded-md bg-white text-sm text-[#1F2A37] shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
                  >
                    <div className="py-2">
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
                          className={`mx-2 flex w-[calc(100%-1rem)] items-center justify-between rounded-md px-2.5 py-2.5 text-left transition ${
                            sortOption === key ? "" : "hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                            <span
                              className={`text-[13px] ${
                                sortOption === key
                                  ? "font-semibold text-[#0F172A]"
                                  : "font-medium text-[#1F2A37]"
                              }`}
                            >
                              {label}
                            </span>
                          </span>
                          {sortOption === key ? (
                            <Check className="h-4.5 w-4.5 text-[#1F2A37]" aria-hidden />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

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
                    className={`inline-flex items-center gap-2 rounded-full border-2 border-[#E6EBF2] px-4 py-2 text-xs font-semibold transition dark:border-zinc-700 ${
                      ownerMenuOpen
                        ? "bg-[#009DFD] text-white dark:bg-zinc-200 dark:text-zinc-900"
                        : "bg-white text-[#1F2A37] hover:border-[#D8DEE8] dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
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
                      className="absolute right-0 z-50 mt-3 w-[320px] overflow-hidden rounded-3xl border border-[#E6EBF2] bg-white text-sm text-[#1F2A37] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <div className="p-4 pb-3">
                        <div className="flex items-center gap-3 rounded-2xl border border-[#E6EBF2] bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/60">
                          <Search className="h-5 w-5 text-[#009DFD] dark:text-zinc-300" aria-hidden />
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
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                                  <UserRound className="h-5 w-5" aria-hidden />
                                </span>
                              ),
                            },
                            {
                              key: "shared",
                              label: "Shared with you",
                              leading: (
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                                  <UsersRound className="h-5 w-5" aria-hidden />
                                </span>
                              ),
                            },
                            {
                              key: "you",
                              label: `${accountName} (You)`,
                              leading: (
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white dark:bg-zinc-700">
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
                                  ? "bg-slate-100 dark:bg-zinc-800/70"
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
            className={`mt-6 flex-1 ${
              forceStableScrollbar || recentHasOverflow ? "overflow-y-auto" : "overflow-y-hidden"
            }`}
            style={{
              paddingRight:
                forceStableScrollbar || recentHasOverflow ? 4 : 4 + recentScrollbarWidth,
              paddingLeft: 6,
              paddingBottom: 6,
              scrollbarGutter: forceStableScrollbar ? "stable" : undefined,
            }}
          >
            <RecentProjectsRow
              initialProjects={initialProjects}
              query={query}
              ownerFilter={ownerFilter}
              sortOption={sortOption}
              showAllProjects={showAllProjects}
              showResumeBadge={showResumeBadge}
            />
          </div>
          {!showAllProjects ? (
            <div className="mt-4 flex items-center">
              <Link
                href="/projects/all"
                className="inline-flex items-center rounded-full border-2 border-[#E6EBF2] px-4 py-2 text-xs font-semibold text-[#1F2A37] transition hover:border-[#D8DEE8] dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-600"
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
