"use client";

import { useEffect, useRef, useState } from "react";

type SlideshowProps = {
  thumbs: string[];
  title: string;
  pagesCount?: number;
};

export default function ProjectSlideshow({ thumbs, title, pagesCount }: SlideshowProps) {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (thumbs.length <= 1) return;
    if (typeof window === "undefined") return;

    intervalRef.current = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % thumbs.length);
    }, 1200);

    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [thumbs]);

  const src = thumbs[index] ?? thumbs[0] ?? "";

  return (
    <div className="relative h-full w-full px-3 pt-4 pb-0">
      <img
        src={src}
        alt={title}
        loading="lazy"
        decoding="async"
        className="absolute inset-x-0 top-0 h-auto w-full object-contain object-[50%_0] drop-shadow-[0_18px_40px_rgba(15,23,42,0.28)] transition-opacity duration-500"
      />
      {typeof pagesCount === "number" && pagesCount > 0 ? (
        <div className="pointer-events-none absolute bottom-2 right-2 flex items-center rounded-full bg-black/65 px-3 py-1.5 text-[11px] sm:px-3.5 sm:py-1.5 sm:text-[12px] md:px-4 md:py-1.5 md:text-[13px] font-semibold tracking-[0.08em] leading-none text-slate-50 opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
          <span>
            {Math.min(index + 1, pagesCount)} of {pagesCount}
          </span>
        </div>
      ) : null}
    </div>
  );
}

