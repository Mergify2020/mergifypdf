"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowDown, ArrowUp, Check, ChevronDown, Clock, RotateCcw, Search, SearchX, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import TrashProjectActions from "@/components/TrashProjectActions";
import TrashHeaderControls from "@/components/TrashHeaderControls";
import { formatFileSize } from "@/lib/formatFileSize";
import { refreshProjectsSummary } from "@/lib/projectsSummaryCache";

type TrashProject = {
  id: string;
  title: string;
  updatedLabel: string;
  trashedAt: string;
  fileSizeBytes?: number | null;
  pagesCount?: number | null;
};

type Props = {
  projects: TrashProject[];
  accountName: string;
  accountEmail?: string | null;
};

type SelectionCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onToggle: () => void;
};

function SelectionCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  ariaLabel,
  onToggle,
}: SelectionCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onToggle}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-[4px] border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47FF]/25 ${
        checked || indeterminate
          ? "border-[#6C47FF] bg-[#6C47FF] text-white"
          : "border-slate-300 bg-white text-transparent hover:border-slate-400 dark:border-zinc-600 dark:bg-zinc-900"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      {indeterminate ? (
        <span className="h-[2px] w-2.5 rounded-full bg-white" aria-hidden />
      ) : (
        <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${checked ? "opacity-100" : "opacity-0"}`} aria-hidden>
          <path
            d="M3.2 8.4 6.6 11.6 12.8 4.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export default function TrashProjectsList({ projects, accountName, accountEmail }: Props) {
  const TRASH_RETENTION_DAYS = 30;
  const DELETE_PROGRESS_MS = 1100;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const router = useRouter();
  const { data: session } = useSession();
  const ownerKey = session?.user?.id ?? null;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState<null | "restore" | "delete">(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [sortOption, setSortOption] = useState<"activity" | "az" | "za">("activity");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const trimmedQuery = query.trim().toLowerCase();

  const filteredProjects = useMemo(() => {
    if (!trimmedQuery) return projects;
    return projects.filter((project) => project.title.toLowerCase().includes(trimmedQuery));
  }, [projects, trimmedQuery]);
  const sortedProjects = useMemo(() => {
    const next = [...filteredProjects];
    if (sortOption === "activity") {
      next.sort((a, b) => new Date(b.trashedAt).getTime() - new Date(a.trashedAt).getTime());
      return next;
    }
    next.sort((a, b) => {
      const left = a.title.trim().toLowerCase();
      const right = b.title.trim().toLowerCase();
      const cmp = left.localeCompare(right);
      return sortOption === "az" ? cmp : -cmp;
    });
    return next;
  }, [filteredProjects, sortOption]);
  const visibleIds = sortedProjects.map((project) => project.id);
  const selectedIds = visibleIds.filter((id) => selected[id]);
  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;
  const allVisibleSelected = visibleIds.length > 0 && selectedCount === visibleIds.length;
  const someVisibleSelected = selectedCount > 0 && selectedCount < visibleIds.length;

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

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = { ...prev };
      if (allVisibleSelected) {
        visibleIds.forEach((id) => {
          delete next[id];
        });
        return next;
      }
      visibleIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  };

  const handleBulkRestore = async () => {
    if (!selectedIds.length || bulkBusy || isPending) return;
    setBulkBusy("restore");
    try {
      await Promise.allSettled(
        selectedIds.map((id) =>
          fetch(`/api/projects/${encodeURIComponent(id)}/trash`, { method: "DELETE" })
        )
      );
      void refreshProjectsSummary(ownerKey);
      setSelected((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setBulkBusy(null);
    }
  };

  const handleBulkDeleteForever = async () => {
    if (!selectedIds.length || bulkBusy || isPending) return;
    setBulkBusy("delete");
    try {
      await Promise.all([
        Promise.allSettled(
          selectedIds.map((id) =>
            fetch(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" })
          )
        ),
        new Promise((resolve) => window.setTimeout(resolve, DELETE_PROGRESS_MS)),
      ]);
      void refreshProjectsSummary(ownerKey);
      setSelected((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setBulkBusy(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="mb-6 flex w-full items-center justify-between gap-3">
        <div className="w-full flex-1 md:max-w-xl">
          <div className="flex h-11 items-center rounded-full border-[1.5px] border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)]">
            <div className="flex h-full w-full items-center gap-2 rounded-full bg-white px-4 text-[#1F2A37] dark:bg-zinc-900 dark:text-zinc-100">
              <Search className="h-5 w-5 text-rose-500 dark:text-rose-400" aria-hidden />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search trash..."
                className="h-full min-w-0 flex-1 border-none bg-white text-base text-[#1F2A37] placeholder:text-[#6B7280] outline-none focus:outline-none focus:ring-0 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                aria-label="Search trash"
              />
            </div>
          </div>
        </div>
        <TrashHeaderControls accountName={accountName} accountEmail={accountEmail} />
      </div>

      <section className="box-border flex min-h-0 flex-1 flex-col rounded-xl border-[1.5px] border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-4 pl-[21px] pr-0">
          <div className="flex items-center gap-3">
            {!hasSelection ? (
              <span className="inline-flex items-center justify-center text-rose-600 dark:text-rose-300">
                <Trash2 className="h-5 w-5" aria-hidden />
              </span>
            ) : null}
            <h2 className="text-2xl font-semibold text-[#1F2A37] dark:text-zinc-100">
              {hasSelection ? (
                <span>
                  {selectedCount} <span className="text-slate-500 dark:text-zinc-400">selected</span>
                </span>
              ) : (
                <span>
                  Deleted projects <span className="text-slate-500 dark:text-zinc-400">({sortedProjects.length})</span>
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 items-center gap-1.5 transition-opacity duration-200 ease-out ${
                hasSelection
                  ? "visible pointer-events-auto opacity-100"
                  : "invisible pointer-events-none opacity-0"
              }`}
            >
              <button
                type="button"
                title="Restore selected projects"
                aria-label="Restore selected projects"
                disabled={bulkBusy !== null || isPending}
                onClick={() => {
                  void handleBulkRestore();
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <RotateCcw className="h-5 w-5" aria-hidden />
                <span>Restore</span>
              </button>
              <button
                type="button"
                title="Delete selected projects forever"
                aria-label="Delete selected projects forever"
                disabled={bulkBusy !== null || isPending}
                onClick={() => {
                  setConfirmDeleteOpen(true);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300 dark:hover:bg-zinc-800 dark:hover:text-rose-300"
              >
                <Trash2 className="h-5 w-5" aria-hidden />
                <span>Delete</span>
              </button>
            </div>
            <div ref={sortMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setSortMenuOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-semibold transition ${
                  sortMenuOpen
                    ? "border-[#E6EBF2] bg-[#E5E7EB] text-[#1F2A37] dark:border-zinc-700 dark:bg-[#2A2A31] dark:text-zinc-100"
                    : "border-[#E6EBF2] bg-white text-[#1F2A37] hover:border-[#D8DEE8] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
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
                  className="project-actions-menu absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#1F2A37] shadow-[0_16px_36px_rgba(15,23,42,0.14)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[0_20px_44px_rgba(0,0,0,0.5)]"
                >
                  <div className="pb-1.5 pt-1.5">
                    {(
                      [
                        { key: "activity", label: "Last activity", Icon: Clock },
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
                            ? "bg-[#F8FAFC] dark:bg-zinc-800/60"
                            : "hover:bg-[#F8FAFC] dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5 text-slate-900 dark:text-zinc-100">
                          <Icon className="h-4 w-4 text-current" aria-hidden />
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
        </div>

        {sortedProjects.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-start justify-center px-6 pt-16 pb-10 text-center sm:pt-20">
            {projects.length === 0 ? (
              <div className="flex flex-col items-center">
                <Image
                  src="/nothingdeletedyet.svg"
                  alt=""
                  width={405}
                  height={405}
                  className="mb-2 h-[285px] w-[285px] opacity-90 sm:h-[360px] sm:w-[360px]"
                  priority
                />
                <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Trash is currently empty.</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Restore a project, or leave it here until it&apos;s removed automatically.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1F4] text-[#E11D48] dark:bg-[#3A1B23] dark:text-[#FDA4AF]">
                  <SearchX className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-zinc-100">
                  No deleted projects found for &quot;{query.trim()}&quot;
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
                  Try a different search or clear it to see everything in trash.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-[6px] pb-[6px]">
            <div className="grid grid-cols-[36px_minmax(260px,340px)_1fr_180px_180px_96px_72px] items-center gap-x-5 border-b border-[#E6EBF2] px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700 dark:border-zinc-700 dark:text-zinc-200 xl:grid-cols-[36px_minmax(260px,340px)_1fr_196px_196px_112px_84px] xl:gap-x-7 2xl:grid-cols-[36px_minmax(260px,340px)_1fr_208px_208px_120px_92px] 2xl:gap-x-8">
              <div className="flex justify-start">
                <SelectionCheckbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  disabled={visibleIds.length === 0}
                  onToggle={toggleSelectAll}
                  ariaLabel="Select all deleted projects"
                />
              </div>
              <div className="text-left">Name</div>
              <div aria-hidden />
              <div className="text-left">Deletes</div>
              <div className="text-left">Opened</div>
              <div className="text-left">Pages</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-[#E6EBF2] dark:divide-zinc-700">
              {sortedProjects.map((project) => {
                const trashedAtMs = new Date(project.trashedAt).getTime();
                const deleteAtMs = trashedAtMs + TRASH_RETENTION_DAYS * DAY_MS;
                const daysRemaining = Math.max(0, Math.ceil((deleteAtMs - now) / DAY_MS));
                const deleteAtLabel = new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(deleteAtMs));
                const deleteText =
                  daysRemaining <= 0
                    ? "Deletes today"
                    : `Deletes in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`;
                const deleteToneClass =
                  daysRemaining <= 3
                    ? "font-semibold text-rose-700 dark:text-rose-300"
                    : "font-medium text-rose-600 dark:text-rose-400";

                return (
                  <div
                    key={project.id}
                    className="grid grid-cols-[36px_minmax(260px,340px)_1fr_180px_180px_96px_72px] items-center gap-x-5 px-4 py-3 xl:grid-cols-[36px_minmax(260px,340px)_1fr_196px_196px_112px_84px] xl:gap-x-7 2xl:grid-cols-[36px_minmax(260px,340px)_1fr_208px_208px_120px_92px] 2xl:gap-x-8"
                  >
                    <div className="flex justify-start">
                      <SelectionCheckbox
                        checked={!!selected[project.id]}
                        onToggle={() => {
                          setSelected((prev) => ({ ...prev, [project.id]: !prev[project.id] }));
                        }}
                        ariaLabel={`Select ${project.title}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-zinc-100">{project.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                        {formatFileSize(project.fileSizeBytes)
                          ? `PDF · ${formatFileSize(project.fileSizeBytes)}`
                          : "PDF"}
                      </p>
                    </div>
                    <div aria-hidden />
                    <div className="text-left">
                      <span
                        title={`Permanently deletes on ${deleteAtLabel}`}
                        className={`text-sm ${deleteToneClass}`}
                      >
                        {deleteText}
                      </span>
                    </div>
                    <div className="truncate text-left text-[15px] text-slate-600 dark:text-zinc-300">
                      {project.updatedLabel}
                    </div>
                    <div className="text-left text-[15px] text-slate-600 dark:text-zinc-300">
                      {project.pagesCount ?? 0}
                    </div>
                    <div className="flex justify-end">
                      <TrashProjectActions projectId={project.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {confirmDeleteOpen && typeof document !== "undefined"
          ? createPortal(
          <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-sm">
            <div className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-[0_20px_52px_rgba(15,23,42,0.24)] dark:bg-zinc-900">
              <h3 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-zinc-100">
                Permanently delete {selectedCount} {selectedCount === 1 ? "project" : "projects"}?
              </h3>
              <p className="mt-4 text-base font-medium text-slate-600 dark:text-zinc-300">
                This action can&apos;t be undone.
              </p>
              <div className="mt-7 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="rounded-xl border-2 border-slate-300 px-4 py-2 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteOpen(false);
                    void handleBulkDeleteForever();
                  }}
                  className="rounded-xl bg-[#E11D48] px-5 py-2 text-base font-semibold text-white transition hover:bg-[#BE123C]"
                >
                  Delete permanently
                </button>
              </div>
            </div>
          </div>,
          document.body
        ) : null}
        {bulkBusy === "delete" && typeof document !== "undefined"
          ? createPortal(
          <div className="fixed inset-0 z-[10100] flex items-center justify-center bg-slate-900/20 px-4 backdrop-blur-[1.5px]">
            <div className="flex min-h-[132px] w-full max-w-[440px] flex-col justify-center rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-[0_20px_52px_rgba(15,23,42,0.24)] dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-center text-xl font-semibold text-slate-900 dark:text-zinc-100">
                Deleting permanently
              </p>
              <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C4B5FD] via-[#8B5CF6] to-[#5B21B6]"
                  style={{ animation: `trash-progress-fill ${DELETE_PROGRESS_MS}ms linear forwards` }}
                />
              </div>
            </div>
          </div>,
          document.body
        ) : null}
      </section>
    </div>
  );
}
