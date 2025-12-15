"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, ChevronDown, Clock, Search, UserRound, UsersRound } from "lucide-react";
import RecentProjectsRow from "@/components/RecentProjectsRow";
import StartProjectButton from "@/components/StartProjectButton";

type SummaryProject = {
  id: string;
  name: string;
  updatedAt: string | Date;
  previewUrl?: string | null;
  pagesCount?: number | null;
};

type Props = {
  firstName: string;
  accountName: string;
  projects: SummaryProject[];
};

type OwnerFilter = "any" | "shared" | "you";
type SortOption = "activity" | "az" | "za";

export default function HomeProjectsSearch({ firstName, accountName, projects }: Props) {
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

  return (
    <>
      <section className="pt-10 lg:pt-14">
        <div className="flex w-full flex-col items-center">
          <div className="home-hero-header flex w-full max-w-4xl flex-col items-center text-center">
            <p className="text-2xl font-normal text-[#013d63] sm:text-3xl">Welcome back, {firstName}.</p>
            <h1 className="home-hero-title mt-2 whitespace-nowrap font-semibold tracking-tight text-[#013d63]">
              What will you work on today?
            </h1>
          </div>

          <div className="mt-6 grid w-full max-w-4xl gap-4 sm:grid-cols-2">
            <div className="flex w-full flex-col items-center gap-2 rounded-[24px] border-[3px] border-slate-300 bg-white px-5 py-4 text-center text-slate-800 shadow-sm">
              <h3 className="whitespace-nowrap text-sm font-semibold text-[#013d63] sm:text-base xl:text-lg">
                Work on something new
              </h3>
              <StartProjectButton
                variant="custom"
                className="inline-flex h-10 w-full max-w-xs items-center justify-center whitespace-nowrap rounded-[12px] border-[3px] border-[#51bdff] bg-[#008ade] px-4 text-xs font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:bg-[#007fcd] hover:shadow-[0_18px_50px_rgba(15,23,42,0.32)] sm:px-6 sm:text-sm xl:text-base"
              />
            </div>

            <div className="flex w-full flex-col items-center gap-2 rounded-[24px] border-[3px] border-slate-300 bg-white px-5 py-4 text-center text-slate-800 shadow-sm">
              <h3 className="whitespace-nowrap text-sm font-semibold text-[#013d63] sm:text-base xl:text-lg">
                Get documents signed
              </h3>
              <Link
                href="/signature-center"
                className="inline-flex h-10 w-full max-w-xs items-center justify-center whitespace-nowrap rounded-[12px] border-[3px] border-[#B9A8FF] bg-[#6A4EE8] px-4 text-xs font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:bg-[#5C3EDB] hover:shadow-[0_18px_50px_rgba(15,23,42,0.32)] sm:px-6 sm:text-sm xl:text-base"
              >
                Open signature Dashboard
                <svg className="ml-2 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M7 17 17 7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 7h9v9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="mt-[50px] w-full max-w-4xl">
            <div
              className="flex cursor-text items-center rounded-[999px] border-[3px] border-slate-300 bg-white px-6 py-5 text-lg text-slate-800 shadow-sm transition hover:border-[#51bdff] hover:bg-slate-50"
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
              <Search className="h-6 w-6 text-[#008ade] sm:h-7 sm:w-7" aria-hidden />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects and documents"
                className="ml-4 flex-1 border-none bg-transparent text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:text-xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-7 w-full">
        <div className="pt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              {query.trim() ? "Search results" : "Recent projects"}
            </h2>
            <div className="flex items-center gap-2">
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
                            {ownerFilter === option.key ? (
                              <Check className="h-6 w-6 text-slate-900" aria-hidden />
                            ) : null}
                          </button>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <RecentProjectsRow
              initialProjects={initialProjects}
              query={query}
              ownerFilter={ownerFilter}
              sortOption={sortOption}
            />
          </div>
          <div className="mt-6 flex justify-center">
            <Link
              href="/projects/all"
              className="inline-flex h-10 items-center justify-center rounded-[12px] border-[3px] border-[#51bdff] bg-[#008ade] px-6 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:bg-[#007fcd] hover:shadow-[0_18px_50px_rgba(15,23,42,0.32)]"
            >
              View all projects
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
