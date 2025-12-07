"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Star, MoreHorizontal, ExternalLink, Copy, Link2, Trash2 } from "lucide-react";

type Project = {
  id: string;
  title: string;
  updated: string;
  previewUrl?: string | null;
  pagesCount?: number;
};

type ProjectCardProps = {
  project: Project;
  isSelected: boolean;
  hasSelection: boolean;
  onToggleSelected: (id: string) => void;
};

export default function ProjectCard({
  project,
  isSelected,
  hasSelection,
  onToggleSelected,
  onTrashed,
}: ProjectCardProps & { onTrashed?: (id: string) => void }) {
  const [starred, setStarred] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  const activePreview = project.previewUrl ?? null;

  const cardClasses = [
    "relative rounded-[10px] bg-[#F9FAFC] transition",
    isSelected ? "ring-[3px] ring-[#4C6FFF] shadow-[0_0_0_4px_rgba(76,111,255,0.15)]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const checkboxClasses = [
    "absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-[8px] border-[2px] text-xs font-semibold shadow-md transition-transform transition-opacity duration-150 xl:h-8 xl:w-8",
    isSelected
      ? "bg-[#4C6FFF] border-[#4C6FFF] text-white opacity-100 scale-100"
      : [
          // Always visible on very small screens (no hover), hover-only from sm and up.
          "bg-white/90 border-slate-200 text-slate-500 opacity-100 scale-100",
          "sm:opacity-0 sm:scale-90 sm:group-hover:opacity-100 sm:group-hover:scale-100 sm:group-hover:border-slate-400",
        ].join(" "),
  ]
    .filter(Boolean)
    .join(" ");
  const actionsContainerClasses = [
    "absolute right-3 top-2 z-10 inline-flex items-center overflow-hidden rounded-[10px] bg-white/95 text-slate-400 shadow-[0_4px_12px_rgba(15,23,42,0.18)]",
    "opacity-100 scale-100 transition-transform transition-opacity duration-150",
    "sm:opacity-0 sm:scale-90 sm:group-hover:opacity-100 sm:group-hover:scale-100",
  ]
    .filter(Boolean)
    .join(" ");
  const actionButtonBase =
    "flex h-9 w-9 items-center justify-center text-sm hover:bg-slate-100/80 transition xl:h-10 xl:w-10";

  return (
    <Link
      href={`/studio?project=${encodeURIComponent(project.id)}`}
      className="group flex flex-col text-left transition hover:-translate-y-1"
      aria-disabled={hasSelection}
      onClick={(event) => {
        if (hasSelection) {
          event.preventDefault();
          event.stopPropagation();
          onToggleSelected(project.id);
        }
      }}
    >
      <div ref={cardRef} className={cardClasses}>
        <button
          type="button"
          className={checkboxClasses}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSelected(project.id);
          }}
          aria-pressed={isSelected}
          aria-label={isSelected ? "Deselect project" : "Select project"}
        >
          {isSelected ? (
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
          ) : null}
        </button>
        {!hasSelection && (
          <>
            <div className={actionsContainerClasses}>
              <button
                type="button"
                className={`${actionButtonBase} ${starred ? "text-yellow-400" : ""}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setStarred((prev) => !prev);
                }}
                aria-pressed={starred}
                aria-label={starred ? "Unstar project" : "Star project"}
              >
                <Star
                  className={`h-4 w-4 ${starred ? "fill-current" : ""}`}
                  strokeWidth={2.4}
                  aria-hidden
                />
              </button>
              <div className="h-4 w-px bg-slate-200/80" aria-hidden />
              <button
                type="button"
                className={actionButtonBase}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const nextOpen = !menuOpen;
                  setMenuOpen(nextOpen);
                  if (!nextOpen) {
                    setMenuPosition(null);
                  } else if (cardRef.current && typeof window !== "undefined") {
                    const rect = cardRef.current.getBoundingClientRect();
                    setMenuPosition({
                      top: rect.top + rect.height / 2,
                      left: rect.right + 16,
                    });
                  }
                }}
                aria-label="Project actions"
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={2.4} aria-hidden />
              </button>
            </div>
            {isMounted &&
              menuOpen &&
              menuPosition &&
              createPortal(
                <div
                  className="fixed z-[9999] w-72 -translate-y-1/2 rounded-[18px] border border-slate-200/70 bg-white/95 py-2 text-sm shadow-[0_18px_40px_rgba(15,23,42,0.22)]"
                  onMouseDown={(event) => {
                    // Prevent the global outside-click handler from firing for clicks inside the menu
                    event.stopPropagation();
                  }}
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  <div className="px-4 pb-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {project.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {project.updated}
                    </p>
                  </div>
                  <div className="my-1 h-px bg-slate-100/90" />
                  <button
                    type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-slate-800 transition hover:bg-slate-50/80"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setMenuOpen(false);
                    setMenuPosition(null);
                  }}
                  >
                    <ExternalLink className="h-4 w-4 text-slate-500" aria-hidden />
                    <span>Open in new tab</span>
                  </button>
                  <button
                    type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-slate-800 transition hover:bg-slate-50/80"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setMenuOpen(false);
                    setMenuPosition(null);
                  }}
                  >
                    <Copy className="h-4 w-4 text-slate-500" aria-hidden />
                    <span>Make a copy</span>
                  </button>
                  <button
                    type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-slate-800 transition hover:bg-slate-50/80"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setMenuOpen(false);
                    setMenuPosition(null);
                  }}
                  >
                    <Link2 className="h-4 w-4 text-slate-500" aria-hidden />
                    <span>Copy link</span>
                  </button>
                  <div className="my-1 h-px bg-slate-100/90" />
                  <button
                    type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-rose-600 transition hover:bg-rose-50/80"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setMenuOpen(false);
                    setMenuPosition(null);
                    void fetch(`/api/projects/${encodeURIComponent(project.id)}/trash`, {
                      method: "POST",
                    }).catch(() => {});
                    if (onTrashed) {
                      onTrashed(project.id);
                    }
                  }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    <span>Move to trash</span>
                  </button>
                </div>,
                document.body
              )}
          </>
        )}
        <div className="relative m-[3px] w-[calc(100%-6px)] aspect-[1.23/1] overflow-hidden rounded-[10px] bg-[#EEF1F5] border border-[rgba(0,0,0,0.06)] transition-colors group-hover:bg-[#E3E8EF]">
          {activePreview ? (
            <div className="relative h-full w-full p-2 sm:p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePreview}
                alt={project.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-slate-500 transition-colors duration-150 group-hover:text-slate-600">
              {project.title.charAt(0)}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-0.5">
        <p className="text-lg font-semibold text-slate-900">{project.title}</p>
        <p className="text-sm text-slate-500">Edited {project.updated}</p>
      </div>
    </Link>
  );
}
