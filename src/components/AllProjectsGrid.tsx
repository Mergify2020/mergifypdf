"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";

type Project = {
  id: string;
  title: string;
  updated: string;
  preview?: string | null;
  pageThumbs?: string[];
  pagesCount?: number;
};

type Props = {
  projects: Project[];
};

export default function AllProjectsGrid({ projects }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const hasSelection = Object.values(selected).some(Boolean);

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <div className="projects-grid mt-10 grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 sm:gap-8 lg:gap-10">
      {projects.map((project) => {
        const isSelected = !!selected[project.id];
        return (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={isSelected}
            hasSelection={hasSelection}
            onToggleSelected={toggleSelected}
          />
        );
      })}
    </div>
  );
}

type ProjectCardProps = {
  project: Project;
  isSelected: boolean;
  hasSelection: boolean;
  onToggleSelected: (id: string) => void;
};

function ProjectCard({ project, isSelected, hasSelection, onToggleSelected }: ProjectCardProps) {
  const allThumbs =
    project.pageThumbs && project.pageThumbs.length > 0
      ? project.pageThumbs
      : project.preview
        ? [project.preview]
        : [];

  const [hoverPageIndex, setHoverPageIndex] = useState(0);
  const [prevPageIndex, setPrevPageIndex] = useState<number | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const currentIndexRef = useRef(0);
  const hasInitializedHoverRef = useRef(false);

  const stopSlideshow = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current);
      slideIntervalRef.current = null;
    }
    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    frameCountRef.current = 0;
    hasInitializedHoverRef.current = false;
    setIsSliding(false);
    setPrevPageIndex(null);
    setHoverPageIndex(0);
    setIsHovering(false);
  }, []);

  const startSlideshow = useCallback(() => {
    const frameCount = allThumbs.length;
    if (frameCount <= 1) return;
    if (hasInitializedHoverRef.current) return;

    hasInitializedHoverRef.current = true;
    frameCountRef.current = frameCount;
    currentIndexRef.current = 0;
    setHoverPageIndex(0);
    setPrevPageIndex(null);
    setIsHovering(true);

    // Preload only the next page preview on first hover.
    if (typeof window !== "undefined" && frameCount > 1) {
      const nextIndex = 1 % frameCount;
      const preloadSrc = allThumbs[nextIndex];
      if (preloadSrc) {
        const img = new window.Image();
        img.src = preloadSrc;
      }
    }

    hoverTimeoutRef.current = setTimeout(() => {
      slideIntervalRef.current = setInterval(() => {
        const totalFrames = frameCountRef.current;
        if (totalFrames <= 1) return;
        const current = currentIndexRef.current;
        const next = (current + 1) % totalFrames;

        setPrevPageIndex(current);
        setHoverPageIndex(next);
        setIsSliding(false);

        if (animationFrameRef.current != null) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(() => {
          setIsSliding(true);
        });
      }, 1200);
    }, 150);
  }, [allThumbs, setHoverPageIndex, setPrevPageIndex]);

  useEffect(
    () => () => {
      stopSlideshow();
    },
    [stopSlideshow],
  );

  useEffect(() => {
    currentIndexRef.current = hoverPageIndex;
  }, [hoverPageIndex]);

  const activeIndex =
    isHovering && allThumbs.length > 1 ? hoverPageIndex % allThumbs.length : 0;
  const activePreview = allThumbs[activeIndex] ?? project.preview ?? null;
  const previousIndex =
    isHovering && prevPageIndex != null && prevPageIndex < allThumbs.length
      ? prevPageIndex
      : null;
  const previousPreview =
    previousIndex != null ? allThumbs[previousIndex] ?? null : null;
  const displayIndex =
    isHovering && allThumbs.length > 1 ? activeIndex : 0;

  const cardClasses = [
    "relative rounded-[10px] bg-[#F9FAFC] transition",
    isSelected ? "ring-[3px] ring-[#4C6FFF] shadow-[0_0_0_4px_rgba(76,111,255,0.15)]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const checkboxClasses = [
    "absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-[8px] border-[2px] text-xs font-semibold shadow-md transition-transform transition-opacity duration-150",
    isSelected
      ? "bg-[#4C6FFF] border-[#4C6FFF] text-white opacity-100 scale-100"
      : "bg-white/90 border-slate-200 text-slate-500 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-hover:border-slate-400",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={`/studio?project=${encodeURIComponent(project.id)}`}
      className="group flex flex-col text-left transition hover:-translate-y-1"
      aria-disabled={hasSelection}
      onMouseEnter={() => {
        if (allThumbs.length > 1) {
          startSlideshow();
        }
      }}
      onMouseLeave={() => {
        stopSlideshow();
      }}
      onClick={(event) => {
        if (hasSelection) {
          event.preventDefault();
          event.stopPropagation();
          onToggleSelected(project.id);
        }
      }}
    >
      <div className={cardClasses}>
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
        <div className="relative m-[3px] w-[calc(100%-6px)] aspect-[1.23/1] overflow-hidden rounded-[10px] bg-[#EEF1F5] border border-[rgba(0,0,0,0.06)] transition-colors group-hover:bg-[#E3E8EF]">
          {activePreview ? (
            <div className="relative h-full w-full px-3 pt-4 pb-0">
              <div className="relative h-full w-full">
                {previousPreview && (
                  <Image
                    key={`prev-${project.id}-${previousIndex}`}
                    src={previousPreview}
                    alt={project.title}
                    width={800}
                    height={1100}
                    className={`absolute inset-x-0 top-0 w-full h-auto object-contain object-[50%_0] filter drop-shadow-[0_18px_40px_rgba(15,23,42,0.28)] transition-transform duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isHovering && isSliding
                        ? "translate-x-[calc(-100%_-_50px)]"
                        : "translate-x-0"
                    }`}
                    onTransitionEnd={(event) => {
                      if (event.propertyName !== "transform") return;
                      setIsSliding(false);
                      setPrevPageIndex((current) =>
                        current === previousIndex ? null : current,
                      );
                    }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                )}
                <Image
                  key={`active-${project.id}-${activeIndex}`}
                  src={activePreview}
                  alt={project.title}
                  width={800}
                  height={1100}
                  className={`absolute inset-x-0 top-0 w-full h-auto object-contain object-[50%_0] filter drop-shadow-[0_18px_40px_rgba(15,23,42,0.28)] transition-transform duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    previousPreview && isHovering && allThumbs.length > 1
                      ? isSliding
                        ? "translate-x-0"
                        : "translate-x-[calc(100%+50px)]"
                      : "translate-x-0"
                  }`}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
              </div>
              {typeof project.pagesCount === "number" && project.pagesCount > 0 ? (
                <div className="pointer-events-none absolute bottom-2 right-2 flex items-center rounded-full bg-black/65 px-3 py-1.5 text-[11px] sm:px-3.5 sm:py-1.5 sm:text-[12px] md:px-4 md:py-1.5 md:text-[13px] font-semibold tracking-[0.08em] leading-none text-slate-50 opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                  <span>{Math.min(displayIndex + 1, project.pagesCount)} of {project.pagesCount}</span>
                </div>
              ) : null}
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
