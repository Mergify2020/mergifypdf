"use client";

import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import UiTooltip from "@/components/UiTooltip";
import type { PendingWorkspaceFile } from "@/components/useWorkspaceFilePreloader";

type Props = {
  files: PendingWorkspaceFile[];
  busy: boolean;
  onChange: (files: PendingWorkspaceFile[]) => void;
  onOpenFilePicker: () => void;
  limitFlashSignal?: number;
  className?: string;
};

export default function PendingFilesReorderList({
  files,
  busy,
  onChange,
  onOpenFilePicker,
  limitFlashSignal = 0,
  className,
}: Props) {
  const maxFiles = 12;
  const [useTouchReorderControls, setUseTouchReorderControls] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [pageCountsById, setPageCountsById] = useState<Record<string, number | null>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [dragMoved, setDragMoved] = useState(false);
  const [dragOverlay, setDragOverlay] = useState<{
    index: number;
    top: number;
    width: number;
    height: number;
    offset: number;
  } | null>(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const limitCounterRef = useRef<HTMLSpanElement>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rowWrapperNodesByIdRef = useRef(new Map<string, HTMLDivElement>());
  const rowPositionsRef = useRef<Array<{ index: number; top: number; height: number }>>([]);
  const pendingLayoutAnimationRef = useRef<Map<string, number> | null>(null);
  const deleteTimerRef = useRef<number | null>(null);
  const pageCountsByIdRef = useRef<Record<string, number | null>>({});
  const dragOverlayRef = useRef<typeof dragOverlay>(null);
  const dragIndexRef = useRef<number | null>(null);
  const insertIndexRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);
  const dragStartYRef = useRef(0);
  const lastPointerYRef = useRef(0);
  const dragDirectionRef = useRef<-1 | 0 | 1>(0);
  const autoScrollRef = useRef<{ direction: -1 | 0 | 1 }>({ direction: 0 });
  const maxScrollRef = useRef(0);
  const listMetricsRef = useRef<{ top: number; width: number; scrollTop: number }>({
    top: 0,
    width: 0,
    scrollTop: 0,
  });
  const visibleIndices = files.map((_, idx) => idx).filter((idx) => idx !== dragIndex);
  const draggedSourceIndex = dragIndex !== null ? visibleIndices.filter((idx) => idx < dragIndex).length : 0;
  const effectiveInsertIndex = dragMoved ? (insertIndex ?? draggedSourceIndex) : draggedSourceIndex;
  const draggedDisplayPosition =
    dragIndex !== null ? Math.min(Math.max(effectiveInsertIndex, 0), files.length - 1) + 1 : null;
  const liveOrderIndices =
    dragIndex === null
      ? files.map((_, idx) => idx)
      : [
          ...visibleIndices.slice(0, Math.min(Math.max(effectiveInsertIndex, 0), visibleIndices.length)),
          dragIndex,
          ...visibleIndices.slice(Math.min(Math.max(effectiveInsertIndex, 0), visibleIndices.length)),
        ];
  const liveDisplayPositions = new Map<number, number>();
  liveOrderIndices.forEach((fileIndex, orderIndex) => {
    liveDisplayPositions.set(fileIndex, orderIndex + 1);
  });
  const canReorder = files.length > 1;

  function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"] as const;
    const base = 1024;
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
    const value = bytes / Math.pow(base, exponent);
    const decimals = exponent === 0 ? 0 : 2;
    return `${value.toFixed(decimals)} ${units[exponent]}`;
  }

  function getFileTypeLabel(file: File) {
    const extension = file.name.split(".").pop()?.trim();
    if (extension) return extension.toUpperCase();
    const subtype = file.type.split("/").pop()?.trim();
    return subtype ? subtype.toUpperCase() : "FILE";
  }

  function captureRowPositions() {
    const currentPositions = new Map<string, number>();
    files.forEach(({ id }) => {
      const node = rowWrapperNodesByIdRef.current.get(id);
      if (node) currentPositions.set(id, node.getBoundingClientRect().top);
    });
    pendingLayoutAnimationRef.current = currentPositions;
  }

  function moveFile(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= files.length) return;
    captureRowPositions();
    const nextFiles = [...files];
    const [moved] = nextFiles.splice(index, 1);
    nextFiles.splice(nextIndex, 0, moved);
    onChange(nextFiles);
  }

  function handleDeleteFile(id: string) {
    if (busy || deletingFileId) return;
    captureRowPositions();
    setDeletingFileId(id);
    deleteTimerRef.current = window.setTimeout(() => {
      onChange(files.filter((entry) => entry.id !== id));
      setDeletingFileId(null);
      deleteTimerRef.current = null;
    }, 190);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updatePointerMode = () => {
      setUseTouchReorderControls(mediaQuery.matches);
    };
    updatePointerMode();
    mediaQuery.addEventListener("change", updatePointerMode);
    return () => {
      mediaQuery.removeEventListener("change", updatePointerMode);
    };
  }, []);

  useEffect(() => {
    if (limitFlashSignal === 0) return;
    const node = limitCounterRef.current;
    if (!node) return;
    node.getAnimations?.().forEach((animation) => animation.cancel());
    node.style.color = "#e11d48";
    node.style.textShadow = "0 0 0 rgba(225, 29, 72, 0)";
    node.style.transform = "scale(1)";

    const animation = node.animate(
      [
        { color: "#e11d48", transform: "scale(1)", textShadow: "0 0 0 rgba(225, 29, 72, 0)" },
        { color: "#e11d48", transform: "scale(1.055)", textShadow: "0 0 14px rgba(225, 29, 72, 0.16)", offset: 0.28 },
        { color: "#e11d48", transform: "scale(1.018)", textShadow: "0 0 8px rgba(225, 29, 72, 0.09)", offset: 0.48 },
        { color: "#e11d48", transform: "scale(1.055)", textShadow: "0 0 14px rgba(225, 29, 72, 0.16)", offset: 0.76 },
        { color: "#e11d48", transform: "scale(1)", textShadow: "0 0 0 rgba(225, 29, 72, 0)", offset: 0.94 },
        { color: "#d97706", transform: "scale(1)", textShadow: "0 0 0 rgba(217, 119, 6, 0)" },
      ],
      {
        duration: 1320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );

    const cleanup = () => {
      node.style.color = "";
      node.style.textShadow = "";
      node.style.transform = "";
    };
    animation.addEventListener("finish", cleanup, { once: true });
    animation.addEventListener("cancel", cleanup, { once: true });
    return () => {
      animation.cancel();
    };
  }, [limitFlashSignal]);

  useLayoutEffect(() => {
    const previousPositions = pendingLayoutAnimationRef.current;
    if (!previousPositions || previousPositions.size === 0) return;
    const animations: HTMLDivElement[] = [];
    files.forEach(({ id }) => {
      const node = rowWrapperNodesByIdRef.current.get(id);
      const previousTop = previousPositions.get(id);
      if (!node || previousTop === undefined) return;
      const nextTop = node.getBoundingClientRect().top;
      const deltaY = previousTop - nextTop;
      if (Math.abs(deltaY) < 1) return;
      node.style.transition = "none";
      node.style.transform = `translateY(${deltaY}px)`;
      node.getBoundingClientRect();
      animations.push(node);
    });
    const rafId = window.requestAnimationFrame(() => {
      animations.forEach((node) => {
        node.style.transition = "transform 320ms cubic-bezier(0.16, 1, 0.3, 1)";
        node.style.transform = "translateY(0)";
        const cleanup = () => {
          node.style.transition = "";
          node.style.transform = "";
          node.removeEventListener("transitionend", cleanup);
        };
        node.addEventListener("transitionend", cleanup);
      });
    });
    pendingLayoutAnimationRef.current = null;
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [files]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current !== null) {
        window.clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const loadPageCount = async (file: File) => {
      try {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
        const workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.js", import.meta.url).toString();
        if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
        }
        const bytes = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: bytes } as never).promise;
        return doc.numPages;
      } catch (err) {
        try {
          const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
          const bytes = await file.arrayBuffer();
          const doc = await pdfjsLib.getDocument({ data: bytes, disableWorker: true } as never).promise;
          return doc.numPages;
        } catch {
          console.warn("Failed to read PDF page count", err);
          return null;
        }
      }
    };

    const run = async () => {
      const nextCounts: Record<string, number | null> = {};
      await Promise.all(
        files.map(async ({ id, file }) => {
          if (cancelled) return;
          const cached = pageCountsByIdRef.current[id];
          if (typeof cached === "number" || cached === null) {
            nextCounts[id] = cached;
            return;
          }
          nextCounts[id] = await loadPageCount(file);
        }),
      );
      if (!cancelled) {
        pageCountsByIdRef.current = { ...pageCountsByIdRef.current, ...nextCounts };
        setPageCountsById(pageCountsByIdRef.current);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [files]);

  function beginReorder(index: number, event: React.PointerEvent<HTMLButtonElement>) {
    if (busy || !canReorder) return;
    const row = rowRefs.current[index];
    const listNode = listRef.current;
    const viewportNode = viewportRef.current;
    if (!row || !listNode || !viewportNode) return;
    const rect = row.getBoundingClientRect();
    const listRect = viewportNode.getBoundingClientRect();
    listMetricsRef.current = {
      top: listRect.top,
      width: rect.width,
      scrollTop: listNode.scrollTop,
    };
    setScrollbarWidth(Math.max(0, listNode.offsetWidth - listNode.clientWidth));
    const initialSourceIndex = rowRefs.current
      .map((_, idx) => idx)
      .filter((idx) => idx !== index)
      .filter((idx) => idx < index).length;
    const overlay = {
      index,
      top: rect.top - listRect.top + listNode.scrollTop,
      width: rect.width,
      height: rect.height,
      offset: event.clientY - rect.top,
    };
    setDragIndex(index);
    setInsertIndex(initialSourceIndex);
    setDragOverlay(overlay);
    dragOverlayRef.current = overlay;
    dragIndexRef.current = index;
    insertIndexRef.current = initialSourceIndex;
    dragMovedRef.current = false;
    setDragMoved(false);
    dragStartYRef.current = event.clientY;
    lastPointerYRef.current = event.clientY;
    dragDirectionRef.current = 0;
    event.preventDefault();
  }

  useEffect(() => {
    if (useTouchReorderControls) return;
    if (dragIndex === null || !canReorder) return;
    const clampOverlayTop = (top: number, height: number) => {
      const listNode = listRef.current;
      if (!listNode) return Math.max(top, 0);
      const minTop = 0;
      const maxTop = listNode.scrollHeight - height;
      if (maxTop < minTop) return minTop;
      return Math.min(Math.max(top, minTop), maxTop);
    };
    const getPinnedOverlayTop = (height: number, direction: -1 | 0 | 1) => {
      const listNode = listRef.current;
      if (!listNode) return 0;
      if (direction === -1) return 0;
      if (direction === 1) return Math.max(0, listNode.scrollHeight - height);
      return 0;
    };
    const recomputeRowPositions = (skipIndex: number) => {
      rowPositionsRef.current = rowRefs.current
        .map((node, rowIndex) => {
          if (!node || rowIndex === skipIndex) return null;
          const box = node.getBoundingClientRect();
          return { index: rowIndex, top: box.top, height: box.height };
        })
        .filter((value): value is { index: number; top: number; height: number } => value !== null)
        .sort((a, b) => a.top - b.top);
    };
    const computeInsertIndex = (overlayTopViewport: number, overlayHeight: number) => {
      const positions = rowPositionsRef.current;
      if (positions.length === 0) {
        insertIndexRef.current = 0;
        setInsertIndex(0);
        return;
      }
      const overlayBottomViewport = overlayTopViewport + overlayHeight;
      const firstRow = positions[0];
      const lastRow = positions[positions.length - 1];
      if (overlayTopViewport <= firstRow.top) {
        insertIndexRef.current = 0;
        setInsertIndex(0);
        return;
      }
      if (overlayBottomViewport >= lastRow.top + lastRow.height) {
        insertIndexRef.current = positions.length;
        setInsertIndex(positions.length);
        return;
      }
      let nextInsert = positions.length;
      const movingDown = dragDirectionRef.current >= 0;
      const probeY = movingDown ? overlayTopViewport + overlayHeight : overlayTopViewport;
      for (let i = 0; i < positions.length; i += 1) {
        const threshold = positions[i].top + positions[i].height * 0.5;
        if (probeY < threshold) {
          nextInsert = i;
          break;
        }
      }
      insertIndexRef.current = nextInsert;
      setInsertIndex(nextInsert);
    };
    const updateReorderFromPointer = (event: PointerEvent) => {
      const overlay = dragOverlayRef.current;
      const currentIndex = dragIndexRef.current;
      if (!overlay || currentIndex === null) return;
      const pointerDelta = event.clientY - lastPointerYRef.current;
      if (pointerDelta > 0) dragDirectionRef.current = 1;
      else if (pointerDelta < 0) dragDirectionRef.current = -1;
      lastPointerYRef.current = event.clientY;
      if (!dragMovedRef.current) {
        const delta = Math.abs(event.clientY - dragStartYRef.current);
        if (delta < 6) return;
        dragMovedRef.current = true;
        setDragMoved(true);
      }
      const listNode = listRef.current;
      if (listNode) {
        const rect = listNode.getBoundingClientRect();
        const edge = 44;
        maxScrollRef.current = Math.max(0, listNode.scrollHeight - listNode.clientHeight);
        if (event.clientY < rect.top + edge) {
          autoScrollRef.current.direction = -1;
        } else if (event.clientY > rect.bottom - edge) {
          autoScrollRef.current.direction = 1;
        } else {
          autoScrollRef.current.direction = 0;
        }
        if (autoScrollRef.current.direction !== 0) {
          dragDirectionRef.current = autoScrollRef.current.direction;
        }
        if (listNode.scrollTop > maxScrollRef.current) {
          listNode.scrollTop = maxScrollRef.current;
        }
        listMetricsRef.current = {
          top: rect.top,
          width: rect.width,
          scrollTop: listNode.scrollTop,
        };
        setScrollbarWidth(Math.max(0, listNode.offsetWidth - listNode.clientWidth));
      }
      const rawTop = event.clientY - listMetricsRef.current.top - overlay.offset;
      const nextTop =
        autoScrollRef.current.direction === 0
          ? clampOverlayTop(rawTop, overlay.height)
          : getPinnedOverlayTop(overlay.height, autoScrollRef.current.direction);
      const nextOverlay = { ...overlay, top: nextTop };
      dragOverlayRef.current = nextOverlay;
      setDragOverlay(nextOverlay);

      recomputeRowPositions(currentIndex);
      computeInsertIndex(listMetricsRef.current.top + nextOverlay.top, overlay.height);
    };
    const finalizeReorder = () => {
      const currentIndex = dragIndexRef.current;
      const nextIndex = insertIndexRef.current;
      if (currentIndex !== null && nextIndex !== null) {
        const dragged = files[currentIndex];
        const remaining = files.filter((_, idx) => idx !== currentIndex);
        const clampedIndex = Math.min(Math.max(nextIndex, 0), remaining.length);
        onChange([...remaining.slice(0, clampedIndex), dragged, ...remaining.slice(clampedIndex)]);
      }
      dragIndexRef.current = null;
      insertIndexRef.current = null;
      dragOverlayRef.current = null;
      dragMovedRef.current = false;
      dragDirectionRef.current = 0;
      autoScrollRef.current.direction = 0;
      setDragMoved(false);
      setDragIndex(null);
      setInsertIndex(null);
      setDragOverlay(null);
    };
    const handleMove = (event: PointerEvent) => updateReorderFromPointer(event);
    const handleUp = () => finalizeReorder();
    let rafId: number | null = null;
    const tick = () => {
      const listNode = listRef.current;
      const dir = autoScrollRef.current.direction;
      if (listNode && dir !== 0) {
        dragDirectionRef.current = dir;
        maxScrollRef.current = Math.max(0, listNode.scrollHeight - listNode.clientHeight);
        const prevScroll = listNode.scrollTop;
        listNode.scrollTop = Math.min(maxScrollRef.current, Math.max(0, listNode.scrollTop + dir * 6));
        if (listNode.scrollTop === 0 && dir === -1) autoScrollRef.current.direction = 0;
        if (listNode.scrollTop === maxScrollRef.current && dir === 1) autoScrollRef.current.direction = 0;
        const delta = listNode.scrollTop - prevScroll;
        listMetricsRef.current.scrollTop = listNode.scrollTop;
        if (delta !== 0 && dragOverlayRef.current) {
          const updated = {
            ...dragOverlayRef.current,
            top:
              autoScrollRef.current.direction === 0
                ? clampOverlayTop(dragOverlayRef.current.top + delta, dragOverlayRef.current.height)
                : getPinnedOverlayTop(dragOverlayRef.current.height, autoScrollRef.current.direction),
          };
          dragOverlayRef.current = updated;
          setDragOverlay(updated);
          recomputeRowPositions(dragIndexRef.current ?? 0);
          const overlayTopViewport = listMetricsRef.current.top + updated.top;
          computeInsertIndex(overlayTopViewport, updated.height);
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    window.addEventListener("pointercancel", handleUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [dragIndex, files, onChange, useTouchReorderControls, canReorder]);

  return (
    <div className={`flex h-[360px] flex-col gap-4 pt-0 pb-0 text-left sm:h-[400px] ${className ?? ""}`}>
      <div className="overflow-hidden rounded-[10px] border-2 border-dashed border-[#D1D5DB] bg-[#F5F5F5] px-3 py-3 shadow-none sm:px-8 dark:border-zinc-700 dark:bg-zinc-800/80">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] font-medium text-slate-700 dark:text-zinc-300">
            <button
              type="button"
              className="cursor-pointer text-[1.05em] font-bold text-slate-900 underline decoration-1 underline-offset-2 transition hover:text-slate-900 disabled:cursor-not-allowed dark:text-zinc-100 dark:hover:text-zinc-100"
              onClick={(event) => {
                event.stopPropagation();
                onOpenFilePicker();
              }}
              disabled={busy}
            >
              {files.length > 0 ? "Add more files" : "Select files"}
            </button>
            {useTouchReorderControls ? null : <>{" "}or drag and drop</>}
          </p>
          <span
            ref={limitCounterRef}
            className={`inline-flex shrink-0 items-center text-sm font-semibold ${
              files.length >= maxFiles ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-zinc-100"
            }`}
          >
            {files.length}/{maxFiles} files
          </span>
        </div>
      </div>

      <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden rounded-[10px] bg-white shadow-none dark:bg-zinc-900">
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-[10px] border-2 border-solid border-[#D1D5DB] dark:border-zinc-700"
          aria-hidden
        />
        <div ref={listRef} className="upload-list-scroll absolute inset-0 z-0 overflow-y-auto bg-white dark:bg-zinc-900">
          {(() => {
            const visibleIndexMap = new Map<number, number>();
            visibleIndices.forEach((idx, position) => {
              visibleIndexMap.set(idx, position);
            });

            const rows = files.map(({ id, file }, index) => {
              const isDraggingRow = dragIndex === index && dragMoved;
              if (isDraggingRow) return null;
              const rowPosition = visibleIndexMap.get(index) ?? 0;
              const showSpacer = dragMoved && dragOverlay !== null && effectiveInsertIndex === rowPosition;
              const isDeletingRow = deletingFileId === id;
              const pageCount = pageCountsById[id];

              return (
                <div
                  key={id}
                  ref={(node) => {
                    if (node) rowWrapperNodesByIdRef.current.set(id, node);
                    else rowWrapperNodesByIdRef.current.delete(id);
                  }}
                  className={`overflow-hidden border-b ${rowPosition === 0 ? "border-t" : ""} border-[#D1D5DB] dark:border-zinc-700 ${
                    isDeletingRow ? "pointer-events-none" : ""
                  }`}
                >
                  {showSpacer ? (
                    <div
                      className="border-y border-[#D1D5DB] bg-[#F6F2FF]/55 dark:border-zinc-700 dark:bg-zinc-800/60"
                      style={{ height: dragOverlay?.height ?? 40 }}
                    />
                  ) : null}
                  <div
                    ref={(node) => {
                      rowRefs.current[index] = node;
                    }}
                    className={`group/file-row flex items-center justify-between gap-3 bg-white px-4 py-3 text-sm text-slate-800 transition-[transform,opacity,filter] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      busy ? "opacity-70" : dragIndex !== null ? "" : "hover:bg-[#F6F2FF]"
                    } ${isDeletingRow ? "translate-x-3 scale-[0.985] opacity-0 blur-[1px]" : ""} dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200`}
                  >
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      {canReorder && useTouchReorderControls ? (
                        <div className="flex w-8 shrink-0 self-stretch py-0.5">
                          <div className="grid h-full w-8 grid-rows-2 overflow-hidden rounded-md border border-slate-200/80 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                            <button
                              type="button"
                              onClick={() => moveFile(index, -1)}
                              className="flex h-full w-full items-center justify-center border-b border-slate-200/80 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                              aria-label={`Move ${file.name} up`}
                              disabled={busy || index === 0}
                            >
                              <ChevronUp className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveFile(index, 1)}
                              className="flex h-full w-full items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                              aria-label={`Move ${file.name} down`}
                              disabled={busy || index === files.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </div>
                      ) : canReorder ? (
                        <button
                          type="button"
                          onPointerDown={(event) => beginReorder(index, event)}
                          className={`flex h-8 w-8 shrink-0 touch-none items-center justify-center rounded-md border border-slate-300 sm:border-2 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 ${
                            busy ? "cursor-not-allowed opacity-60" : "cursor-grab active:cursor-grabbing"
                          } dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200`}
                          aria-label={`Reorder ${file.name}`}
                          disabled={busy}
                        >
                          <GripVertical className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                      <span className="w-5 shrink-0 text-center text-sm font-semibold text-slate-500 dark:text-zinc-400 sm:w-6">
                        {liveDisplayPositions.get(index) ?? index + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 dark:text-zinc-100">
                          {file.name}
                        </span>
                        <span className="block text-xs font-semibold text-slate-900 dark:text-zinc-300">
                          {getFileTypeLabel(file)} - {formatBytes(file.size)}
                          {typeof pageCount === "number" ? ` · ${pageCount} ${pageCount === 1 ? "page" : "pages"}` : ""}
                        </span>
                      </div>
                    </div>
                    <UiTooltip label="Remove file">
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(id)}
                        className={`rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${
                          useTouchReorderControls
                            ? ""
                            : "opacity-0 group-hover/file-row:opacity-100 group-focus-within/file-row:opacity-100"
                        }`}
                        aria-label={`Remove ${file.name}`}
                        disabled={busy || deletingFileId !== null}
                      >
                        <Trash2 className="h-5 w-5" aria-hidden />
                      </button>
                    </UiTooltip>
                  </div>
                </div>
              );
            });

            const tailSpacer =
              dragMoved && dragOverlay && effectiveInsertIndex === visibleIndices.length ? (
                <div
                  key="drag-tail-spacer"
                  className="border-y border-[#D1D5DB] bg-[#F6F2FF]/55 dark:border-zinc-700 dark:bg-zinc-800/60"
                  style={{ height: dragOverlay.height }}
                />
              ) : null;

            return [...rows, tailSpacer];
          })()}

        </div>
        {!useTouchReorderControls && dragOverlay && dragMoved ? (
          <div
            className="pointer-events-none absolute left-0 z-10"
            style={{
              top: dragOverlay.top,
              right: scrollbarWidth,
            }}
          >
            <div
              className="flex items-center justify-between gap-3 border-2 border-[#A98BFF] bg-[#F6F2FF] px-4 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.18)] dark:border-[#7b67c5] dark:bg-zinc-900"
              style={{ height: dragOverlay.height, boxSizing: "border-box" }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-slate-50 text-slate-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <GripVertical className="h-4 w-4" aria-hidden />
                </span>
                <span className="shrink-0 text-sm font-semibold text-[#5B38E6] dark:text-[#C4B5FD]">
                  {draggedDisplayPosition ?? dragOverlay.index + 1}
                </span>
                <div className="min-w-0">
                  {(() => {
                    const draggedFile = files[dragOverlay.index];
                    const draggedPageCount = draggedFile ? pageCountsById[draggedFile.id] : null;
                    return (
                      <>
                        <span className="block truncate font-semibold text-slate-900 dark:text-zinc-100">
                          {draggedFile?.file.name}
                        </span>
                        <span className="block text-xs font-semibold text-slate-900 dark:text-zinc-300">
                          {getFileTypeLabel(draggedFile?.file as File)} -{" "}
                          {formatBytes(draggedFile?.file.size ?? 0)}
                          {typeof draggedPageCount === "number"
                            ? ` · ${draggedPageCount} ${draggedPageCount === 1 ? "page" : "pages"}`
                            : ""}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <span className="h-7 w-7 shrink-0" aria-hidden />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
