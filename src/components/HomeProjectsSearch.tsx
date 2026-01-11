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
};

type OwnerFilter = "any" | "shared" | "you";
type SortOption = "activity" | "az" | "za";

export default function HomeProjectsSearch({ firstName, accountName, accountEmail, projects }: Props) {
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
    const measureScrollbarWidth = () => {
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
    const stored = window.localStorage.getItem("mpdf:theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("mpdf:theme", theme);
  }, [theme]);

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
          <div className="flex w-full items-center justify-between gap-3 lg:mr-[-312px] lg:w-[calc(100%+312px)]">
            <div className="flex flex-1 items-center gap-6">
              <p className="whitespace-nowrap text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2563EB]">
                Hello, {firstName}
              </p>
              <div className="flex w-full items-center gap-6">
                <div className="flex w-full max-w-sm">
                  <div
                    className="flex h-11 w-full cursor-text rounded-full border border-[#E5E7EB] bg-transparent p-[1px] shadow-[0_12px_36px_rgba(15,23,42,0.10)] focus-within:border-transparent focus-within:bg-gradient-to-r focus-within:from-[#009DFD] focus-within:to-[#4F46E5]"
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
                    <div className="flex h-full w-full items-center gap-2 rounded-full bg-white px-4 text-[#1F2A37]">
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
                            <stop offset="0%" stopColor="#009DFD" />
                            <stop offset="100%" stopColor="#4F46E5" />
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
                        className="h-full min-w-0 flex-1 border-none bg-white text-sm text-[#1F2A37] placeholder:text-[#6B7280] outline-none focus:outline-none focus:ring-0 sm:text-base"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#1F2A37] transition hover:bg-slate-50"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-pressed={theme === "dark"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
              </button>
              <div className="flex h-11 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white py-1.5 pl-1 pr-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                <div className="shrink-0">
                  <SettingsMenu />
                </div>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="max-w-[220px] truncate text-[13px] font-semibold text-[#1F2A37]">
                    {accountName}
                  </span>
                  {accountEmail ? (
                    <span className="max-w-[220px] truncate text-[11px] font-medium text-[#64748B]">
                      {accountEmail}
                    </span>
                  ) : null}
                </span>
                <ChevronDown className="h-4 w-4 text-[#94A3B8]" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 w-full">
        <div
          ref={recentCardRef}
          className="flex min-h-0 flex-col rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.10)] sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-[#1F2A37] sm:text-lg">
              {query.trim() ? "Search results" : "Recent projects"}
            </h2>
            <div className="flex items-center gap-2">
              <div ref={sortMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-full border-2 border-[#E6EBF2] px-4 py-2 text-xs font-semibold transition ${
                    sortMenuOpen ? "bg-[#009DFD] text-white" : "bg-white text-[#1F2A37] hover:border-[#D8DEE8]"
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
                    className="absolute left-0 z-50 mt-3 w-[320px] overflow-hidden rounded-3xl border border-[#E6EBF2] bg-white text-sm text-[#1F2A37]"
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
                            <span className="truncate text-base font-medium text-[#1F2A37]">{label}</span>
                          </span>
                          {sortOption === key ? <Check className="h-6 w-6 text-[#1F2A37]" aria-hidden /> : null}
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
                  className={`inline-flex items-center gap-2 rounded-full border-2 border-[#E6EBF2] px-4 py-2 text-xs font-semibold transition ${
                    ownerMenuOpen ? "bg-[#009DFD] text-white" : "bg-white text-[#1F2A37] hover:border-[#D8DEE8]"
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
                    className="absolute right-0 z-50 mt-3 w-[320px] overflow-hidden rounded-3xl border border-[#E6EBF2] bg-white text-sm text-[#1F2A37]"
                  >
                    <div className="p-4 pb-3">
                      <div className="flex items-center gap-3 rounded-2xl border border-[#E6EBF2] bg-white px-4 py-3">
                        <Search className="h-5 w-5 text-[#009DFD]" aria-hidden />
                        <input
                          type="text"
                          value={ownerSearch}
                          onChange={(event) => setOwnerSearch(event.target.value)}
                          placeholder="Search people"
                          className="w-full border-none bg-transparent text-sm text-[#1F2A37] placeholder:text-[#6B7280] focus:outline-none focus:ring-0"
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
                              <span className="truncate text-base font-medium text-[#1F2A37]">{option.label}</span>
                            </span>
                            {ownerFilter === option.key ? (
                              <Check className="h-6 w-6 text-[#1F2A37]" aria-hidden />
                            ) : null}
                          </button>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
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
              scrollbarGutter: forceStableScrollbar ? "stable" : undefined,
            }}
          >
            <RecentProjectsRow
              initialProjects={initialProjects}
              query={query}
              ownerFilter={ownerFilter}
              sortOption={sortOption}
            />
          </div>
          <div className="mt-6 flex justify-start">
            <Link
              href="/projects/all"
              className="inline-flex h-10 items-center justify-center rounded-full border-2 border-[#5FB8F5] bg-[#1D9BF0] px-6 text-xs font-medium tracking-wide text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] transition hover:bg-[#1787D0] sm:text-sm"
            >
              View all projects
            </Link>
          </div>
        </div>
      </section>

    </>
  );
}
