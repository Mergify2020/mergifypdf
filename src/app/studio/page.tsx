"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import dynamic from "next/dynamic";
import { PDFDocument, rgb } from "pdf-lib";
import { Highlighter, Minus, Plus, Trash2, Undo2, Eraser } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SourceRef = { url: string; name: string; size: number };
type PageItem = {
  id: string;
  srcIdx: number; // which source file
  pageIdx: number; // page index inside that source
  thumb: string; // small preview
  preview: string; // large preview
};
type Point = { x: number; y: number };
type HighlightStroke = {
  id: string;
  points: Point[];
  color: string;
  thickness: number;
};
type DraftHighlight = {
  pageId: string;
  points: Point[];
  color: string;
  thickness: number;
};
type HighlightHistoryEntry =
  | { type: "add"; pageId: string; highlight: HighlightStroke }
  | { type: "delete"; pageId: string; highlight: HighlightStroke }
  | { type: "clear"; previous: Record<string, HighlightStroke[]> };

const HIGHLIGHT_COLORS = {
  yellow: "#fff266",
  green: "#b7ff9a",
  blue: "#9ad9ff",
  pink: "#ffc5f1",
} as const;

type HighlightColorKey = keyof typeof HIGHLIGHT_COLORS;

const HIGHLIGHT_CURSOR =
  "data:image/svg+xml;utf8,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 24 L24 2 L30 8 L10 28 L3 29 Z' fill='%23024d7c'/%3E%3Crect x='5' y='25' width='10' height='3' fill='%23ffd43b'/%3E%3C/svg%3E";
const PREVIEW_BASE_SCALE = 1.35;
const MAX_DEVICE_PIXEL_RATIO = 2.5;
const THUMB_MAX_WIDTH = 200;
const PREVIEW_IMAGE_QUALITY = 0.95;

function getDevicePixelRatio() {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio ? Math.min(window.devicePixelRatio, MAX_DEVICE_PIXEL_RATIO) : 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return null;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

function pointDistance(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function cloneStroke(stroke: HighlightStroke): HighlightStroke {
  return {
    ...stroke,
    points: stroke.points.map((pt) => ({ ...pt })),
  };
}

function cloneHighlightMap(map: Record<string, HighlightStroke[]>): Record<string, HighlightStroke[]> {
  return Object.fromEntries(
    Object.entries(map).map(([pageId, list]) => [pageId, list.map((stroke) => cloneStroke(stroke))])
  );
}

/** One sortable thumbnail tile */
function SortableThumb({
  item,
  index,
  selected,
  onSelect,
}: {
  item: PageItem;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
  };

  return (
    <li ref={setNodeRef} style={style} className="w-full" {...attributes} {...listeners}>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full flex-col items-center gap-3 rounded-2xl border px-3 pb-3 pt-4 text-left shadow-sm transition ${
          selected
            ? "border-brand bg-brand/5 ring-2 ring-brand/40"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
            selected ? "bg-brand text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          {index + 1}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumb}
          alt={`Page ${index + 1}`}
          className="pointer-events-none w-full border border-slate-200 bg-white shadow"
        />
      </button>
    </li>
  );
}

function WorkspaceClient() {
  const [sources, setSources] = useState<SourceRef[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState<HighlightColorKey>("yellow");
  const [highlightThickness, setHighlightThickness] = useState(14);
  const [highlights, setHighlights] = useState<Record<string, HighlightStroke[]>>({});
  const [highlightHistory, setHighlightHistory] = useState<HighlightHistoryEntry[]>([]);
  const [draftHighlight, setDraftHighlight] = useState<DraftHighlight | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);

  const addInputRef = useRef<HTMLInputElement>(null);
  const renderedSourcesRef = useRef(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewNodeMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const MIN_HIGHLIGHT_THICKNESS = 6;
  const MAX_HIGHLIGHT_THICKNESS = 32;

  // Better drag in grids
  const sensors = useSensors(useSensor(PointerSensor));

  /** Read files from landing page (sessionStorage "mpdf:files") on first load */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("mpdf:files");
      if (!raw) return;
      const initial: SourceRef[] = JSON.parse(raw);
      if (Array.isArray(initial) && initial.length > 0) {
        setSources(initial);
      }
    } catch {
      // ignore
    }
  }, []);

  /** Render thumbnails for any sources that haven't been processed yet */
  useEffect(() => {
    if (sources.length === 0) {
      setPages([]);
      renderedSourcesRef.current = 0;
      return;
    }

    if (renderedSourcesRef.current >= sources.length) return;

    let cancelled = false;
    async function renderNewSources() {
      setLoading(true);
      setError(null);
      const next: PageItem[] = [];
      const startIdx = renderedSourcesRef.current;

      try {
        // Import pdf.js in the browser only
        const pdfjsLib = (await import("pdfjs-dist")) as typeof import("pdfjs-dist") & {
          GlobalWorkerOptions: { workerSrc: string };
        };
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

        const pixelRatio = getDevicePixelRatio();
        const previewScale = PREVIEW_BASE_SCALE;

        // Only render thumbnails for sources we haven't seen yet
        for (let s = startIdx; s < sources.length; s++) {
          const src = sources[s];
          const pdf = await pdfjsLib.getDocument(src.url).promise;
          for (let p = 1; p <= pdf.numPages; p++) {
            if (cancelled) return;
            const page = await pdf.getPage(p);
            const viewport = page.getViewport({ scale: previewScale });
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d")!;

            const scaledWidth = Math.floor(viewport.width * pixelRatio);
            const scaledHeight = Math.floor(viewport.height * pixelRatio);
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;

            const renderContext = {
              canvasContext: ctx,
              viewport,
              transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined,
            };

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            await page.render(renderContext).promise;

            const previewData = canvas.toDataURL("image/png", PREVIEW_IMAGE_QUALITY);

            let thumbData = previewData;
            if (scaledWidth > THUMB_MAX_WIDTH) {
              const ratio = THUMB_MAX_WIDTH / scaledWidth;
              const thumbCanvas = document.createElement("canvas");
              thumbCanvas.width = THUMB_MAX_WIDTH;
              thumbCanvas.height = Math.floor(scaledHeight * ratio);
              const thumbCtx = thumbCanvas.getContext("2d")!;
              thumbCtx.imageSmoothingEnabled = true;
              thumbCtx.imageSmoothingQuality = "high";
              thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
              thumbData = thumbCanvas.toDataURL("image/png", PREVIEW_IMAGE_QUALITY);
            }

            next.push({
              id: crypto.randomUUID(),
              srcIdx: s,
              pageIdx: p - 1,
              thumb: thumbData,
              preview: previewData,
            });
          }
        }

        if (!cancelled) {
          setPages((prev) => [...prev, ...next]);
          renderedSourcesRef.current = sources.length;
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not render previews (file may be encrypted or corrupted).");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderNewSources();
    return () => {
      cancelled = true;
    };
  }, [sources]);

  useEffect(() => {
    if (pages.length === 0) {
      setActivePageId(null);
      return;
    }
    if (!activePageId || !pages.some((p) => p.id === activePageId)) {
      setActivePageId(pages[0].id);
    }
  }, [pages, activePageId]);

  useEffect(() => {
    setHighlights((prev) => {
      const allowed = new Set(pages.map((p) => p.id));
      const next: Record<string, HighlightStroke[]> = {};
      allowed.forEach((id) => {
        if (prev[id]) next[id] = prev[id];
      });
      if (Object.keys(prev).length === Object.keys(next).length) {
        return prev;
      }
      return next;
    });
  }, [pages]);

  useEffect(() => {
    const allowed = new Set(pages.map((p) => p.id));
    setHighlightHistory((prev) =>
      prev.filter((entry) => (entry.type === "clear" ? true : allowed.has(entry.pageId)))
    );
  }, [pages]);

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container || pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute("data-page-id");
          if (id) {
            setActivePageId((prev) => (prev === id ? prev : id));
          }
        }
      },
      { root: container, threshold: 0.65 }
    );

    previewNodeMap.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pages]);

  /** Add more PDFs (create object URLs and append to sources) */
  function handleAddClick() {
    addInputRef.current?.click();
  }
  function handleAddChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    const newRefs: SourceRef[] = list
      .filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
      .map((f) => ({
        url: URL.createObjectURL(f),
        name: f.name,
        size: f.size,
      }));
    if (newRefs.length) {
      const merged = [...sources, ...newRefs];
      setSources(merged);
      sessionStorage.setItem("mpdf:files", JSON.stringify(merged));
    }
    e.currentTarget.value = "";
  }

  function handleSelectPage(id: string) {
    setActivePageId(id);
    const node = previewNodeMap.current.get(id);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function registerPreviewRef(id: string) {
    return (node: HTMLDivElement | null) => {
      if (node) {
        previewNodeMap.current.set(id, node);
      } else {
        previewNodeMap.current.delete(id);
      }
    };
  }

  const commitDraftHighlight = useCallback(
    (stroke: DraftHighlight | null, cancel?: boolean) => {
      if (!stroke || cancel || stroke.points.length < 2) {
        return;
      }
      const highlight: HighlightStroke = {
        id: crypto.randomUUID(),
        points: stroke.points.map((pt) => ({ ...pt })),
        color: stroke.color,
        thickness: stroke.thickness,
      };
      setHighlights((existing) => {
        const nextList = existing[stroke.pageId] ? [...existing[stroke.pageId]] : [];
        nextList.push(highlight);
        return { ...existing, [stroke.pageId]: nextList };
      });
      setHighlightHistory((prev) => [...prev, { type: "add", pageId: stroke.pageId, highlight: cloneStroke(highlight) }]);
    },
    []
  );

  useEffect(() => {
    if (!draftHighlight || typeof window === "undefined") return;
    function handleWindowUp() {
      setDraftHighlight((current) => {
        if (!current) return null;
        commitDraftHighlight(current);
        return null;
      });
    }
    window.addEventListener("mouseup", handleWindowUp);
    return () => window.removeEventListener("mouseup", handleWindowUp);
  }, [draftHighlight, commitDraftHighlight]);

  useEffect(() => {
    if (!highlightMode) {
      setDraftHighlight(null);
    }
  }, [highlightMode]);

  useEffect(() => {
    if (deleteMode) {
      setHighlightMode(false);
      setDraftHighlight(null);
    }
  }, [deleteMode]);

  function getPointerPoint(event: ReactMouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
      rectWidth: rect.width,
    };
  }

  function handleHighlightPointerDown(pageId: string, event: ReactMouseEvent<HTMLDivElement>) {
    if (!highlightMode || deleteMode) return;
    const point = getPointerPoint(event);
    if (!point) return;
    setDraftHighlight({
      pageId,
      points: [{ x: point.x, y: point.y }],
      color: HIGHLIGHT_COLORS[highlightColor],
      thickness: highlightThickness / point.rectWidth,
    });
    event.preventDefault();
  }

  function handleHighlightPointerMove(pageId: string, event: ReactMouseEvent<HTMLDivElement>) {
    if (!highlightMode || deleteMode) return;
    const point = getPointerPoint(event);
    if (!point) return;
    setDraftHighlight((prev) => {
      if (!prev || prev.pageId !== pageId) return prev;
      const nextPoints = [...prev.points];
      const last = nextPoints[nextPoints.length - 1];
      if (!last || pointDistance(last, { x: point.x, y: point.y }) > 0.004) {
        nextPoints.push({ x: point.x, y: point.y });
      }
      return {
        ...prev,
        points: nextPoints,
        thickness: highlightThickness / point.rectWidth,
      };
    });
    if (draftHighlight?.pageId === pageId) {
      event.preventDefault();
    }
  }

  function handleHighlightPointerUp(pageId: string) {
    if (!highlightMode || deleteMode) return;
    setDraftHighlight((prev) => {
      if (!prev || prev.pageId !== pageId) return prev;
      commitDraftHighlight(prev);
      return null;
    });
  }

  function handlePageStep(direction: 1 | -1) {
    if (pages.length === 0) return;
    let currentIndex = pages.findIndex((p) => p.id === activePageId);
    if (currentIndex === -1) currentIndex = 0;
    const nextIndex = Math.min(
      pages.length - 1,
      Math.max(0, currentIndex + direction)
    );
    const targetPage = pages[nextIndex];
    if (targetPage) {
      handleSelectPage(targetPage.id);
    }
  }


  /** Drag end reorders the pages array */
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((x) => x.id === active.id);
    const newIndex = pages.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setPages((prev) => arrayMove(prev, oldIndex, newIndex));
  }

  /** Build final PDF respecting order + keep flags */
  async function handleDownload() {
    try {
      if (pages.length === 0) {
        setError("Add at least one page first.");
        return;
      }
      setBusy(true);
      setError(null);

      // Load each unique source once into a PDFDocument, cache in a map
      const docCache = new Map<number, PDFDocument>();
      for (const p of pages) {
        if (!docCache.has(p.srcIdx)) {
          const srcUrl = sources[p.srcIdx].url;
          const ab = await (await fetch(srcUrl)).arrayBuffer();
          const srcDoc = await PDFDocument.load(new Uint8Array(ab));
          docCache.set(p.srcIdx, srcDoc);
        }
      }

      // Now copy pages in the displayed order
      const out = await PDFDocument.create();
      for (const p of pages) {
        const srcDoc = docCache.get(p.srcIdx)!;
        const [copied] = await out.copyPages(srcDoc, [p.pageIdx]);
        const pageHighlights = highlights[p.id] ?? [];
        if (pageHighlights.length > 0) {
          const { width: pageWidth, height: pageHeight } = copied.getSize();
          pageHighlights.forEach((stroke) => {
            const colorValue = hexToRgb(stroke.color);
            if (!colorValue) return;
            for (let i = 1; i < stroke.points.length; i++) {
              const start = stroke.points[i - 1];
              const end = stroke.points[i];
              copied.drawLine({
                start: {
                  x: start.x * pageWidth,
                  y: pageHeight - start.y * pageHeight,
                },
                end: {
                  x: end.x * pageWidth,
                  y: pageHeight - end.y * pageHeight,
                },
                thickness: Math.max(1, stroke.thickness * pageWidth),
                color: rgb(colorValue.r, colorValue.g, colorValue.b),
                opacity: 0.4,
              });
            }
          });
        }
        out.addPage(copied);
      }

      const bytes = await out.save(); // Uint8Array
      // TS-safe Blob creation
      const ab = (bytes.buffer as ArrayBuffer).slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      );
      const view = new Uint8Array(ab);
      const blob = new Blob([view], { type: "application/pdf" });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MergifyPDF-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("Failed to build the PDF. Try smaller or non-encrypted files.");
    } finally {
      setBusy(false);
    }
  }

  const itemsIds = useMemo(() => pages.map((p) => p.id), [pages]);
  const downloadDisabled = busy || pages.length === 0;
  const activePageIndex = pages.findIndex((p) => p.id === activePageId);
  const zoomLabel = `${Math.round(zoom * 100)}%`;
  const minZoom = 0.6;
  const maxZoom = 2;
  const zoomStep = 0.1;
  const canZoomOut = zoom > minZoom + 0.001;
  const canZoomIn = zoom < maxZoom - 0.001;
  const highlightButtonDisabled = pages.length === 0 || loading;
  const highlightColorEntries = Object.entries(
    HIGHLIGHT_COLORS
  ) as [HighlightColorKey, string][];
  const highlightActive = highlightMode && !highlightButtonDisabled && !deleteMode;
  const hasAnyHighlights = Object.values(highlights).some((list) => list && list.length > 0);
  const hasUndoHistory = highlightHistory.length > 0;

  useEffect(() => {
    if (!hasAnyHighlights && deleteMode) {
      setDeleteMode(false);
    }
  }, [hasAnyHighlights, deleteMode]);

  function adjustHighlightThickness(delta: number) {
    setHighlightThickness((prev) => clamp(prev + delta, MIN_HIGHLIGHT_THICKNESS, MAX_HIGHLIGHT_THICKNESS));
  }

  function handleUndoHighlight() {
    setHighlightHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setHighlights((map) => {
        switch (last.type) {
          case "add": {
            const list = map[last.pageId];
            if (!list) return map;
            const filtered = list.filter((stroke) => stroke.id !== last.highlight.id);
            if (filtered.length === list.length) return map;
            const next = { ...map };
            if (filtered.length > 0) {
              next[last.pageId] = filtered;
            } else {
              delete next[last.pageId];
            }
            return next;
          }
          case "delete": {
            const next = { ...map };
            const list = next[last.pageId] ? [...next[last.pageId]] : [];
            list.push(cloneStroke(last.highlight));
            next[last.pageId] = list;
            return next;
          }
          case "clear":
            return cloneHighlightMap(last.previous);
          default:
            return map;
        }
      });
      return prev.slice(0, -1);
    });
  }

  function handleClearHighlights() {
    if (!hasAnyHighlights) return;
    setDraftHighlight(null);
    setDeleteMode(false);
    setHighlights((current) => {
      const snapshot = cloneHighlightMap(current);
      setHighlightHistory((prev) => [...prev, { type: "clear", previous: snapshot }]);
      return {};
    });
  }

  function handleDeleteHighlight(pageId: string, highlightId: string) {
    let removed: HighlightStroke | null = null;
    setHighlights((map) => {
      const list = map[pageId];
      if (!list) return map;
      const index = list.findIndex((stroke) => stroke.id === highlightId);
      if (index === -1) return map;
      removed = list[index];
      const filtered = list.slice(0, index).concat(list.slice(index + 1));
      const next = { ...map };
      if (filtered.length > 0) {
        next[pageId] = filtered;
      } else {
        delete next[pageId];
      }
      return next;
    });
    if (removed) {
      setHighlightHistory((prev) => [...prev, { type: "delete", pageId, highlight: cloneStroke(removed!) }]);
    }
  }

  function handleToggleDeleteMode() {
    if (!hasAnyHighlights && !deleteMode) return;
    setDeleteMode((prev) => {
      const next = !prev;
      if (next) {
        setHighlightMode(false);
        setDraftHighlight(null);
      }
      return next;
    });
  }

  const toolbarMessage = deleteMode
    ? "Delete mode is active — click any highlight to remove it."
    : highlightActive
      ? "Highlight mode is active — drag across a page to mark text."
      : hasAnyHighlights
        ? "Select a highlight to delete, or keep editing."
        : "Choose a tool to start marking up your document.";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f3fbff,_#ffffff)] pt-16">
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Editing tools</p>
                <p className="text-xs text-slate-500">{toolbarMessage}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={highlightButtonDisabled}
                  onClick={() =>
                    setHighlightMode((prev) => {
                      const next = !prev;
                      if (next) setDeleteMode(false);
                      return next;
                    })
                  }
                  aria-pressed={highlightActive}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    highlightActive
                      ? "border-transparent bg-[#024d7c] text-white shadow-lg shadow-[#012a44]/30"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 disabled:hover:border-slate-200"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Highlighter className="h-4 w-4" />
                  Highlight
                </button>
                <button
                  type="button"
                  onClick={handleToggleDeleteMode}
                  disabled={!hasAnyHighlights && !deleteMode}
                  aria-pressed={deleteMode}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    deleteMode
                      ? "border-transparent bg-slate-900 text-white shadow-lg shadow-slate-900/25"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 disabled:hover:border-slate-200"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Eraser className="h-4 w-4" />
                  Select highlights
                </button>
                <button
                  type="button"
                  onClick={handleUndoHighlight}
                  disabled={!hasUndoHistory}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition hover:border-slate-300 disabled:opacity-40"
                >
                  <Undo2 className="h-4 w-4" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleClearHighlights}
                  disabled={!hasAnyHighlights}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition hover:border-slate-300 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>
            <div
              className={`overflow-hidden rounded-2xl border border-slate-100/80 bg-slate-50/80 px-4 transition-all duration-300 ease-out ${
                highlightActive
                  ? "pointer-events-auto max-h-40 translate-x-0 opacity-100 py-3"
                  : "pointer-events-none max-h-0 -translate-x-4 opacity-0 py-0"
              }`}
            >
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  {highlightColorEntries.map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setHighlightColor(key)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                        highlightColor === key
                          ? "border-[#024d7c] ring-2 ring-[#024d7c]/30"
                          : "border-white/30 hover:border-slate-300"
                      }`}
                      style={{ backgroundColor: value }}
                      aria-label={`Use ${key} highlighter`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
                  <button
                    type="button"
                    onClick={() => adjustHighlightThickness(-2)}
                    disabled={highlightThickness <= MIN_HIGHLIGHT_THICKNESS}
                    className="rounded-full border border-transparent p-1 transition hover:border-slate-200 hover:bg-white disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span>{Math.round(highlightThickness)} px</span>
                  <button
                    type="button"
                    onClick={() => adjustHighlightThickness(2)}
                    disabled={highlightThickness >= MAX_HIGHLIGHT_THICKNESS}
                    className="rounded-full border border-transparent p-1 transition hover:border-slate-200 hover:bg-white disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Workspace</h1>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-4 pb-32 lg:px-6 lg:pt-6">

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-gray-600 shadow-sm">
            Rendering previews...
          </div>
        )}

        {!loading && pages.length > 0 && (
          <div className="rounded-3xl border border-slate-100 bg-white/95 p-5 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Large preview</p>
                    <p className="text-xs text-slate-500">Scroll to review every page</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {pages.length} {pages.length === 1 ? "page" : "pages"}
                  </span>
                </div>
                <div
                  ref={previewContainerRef}
                  className="h-[70vh] space-y-8 overflow-y-auto px-5 py-6"
                >
                  {pages.map((page, idx) => {
                    const pageHighlights = highlights[page.id] ?? [];
                    return (
                      <div
                        key={page.id}
                        data-page-id={page.id}
                        ref={registerPreviewRef(page.id)}
                        className={`rounded-3xl border bg-white p-4 shadow-sm transition ${
                          activePageId === page.id
                            ? "border-brand ring-2 ring-brand/30"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
                          <span>Page {idx + 1}</span>
                          <span
                            className="truncate text-right tracking-[0.2em]"
                            title={sources[page.srcIdx]?.name ?? "Uploaded PDF"}
                          >
                            {sources[page.srcIdx]?.name ?? "Uploaded PDF"}
                          </span>
                        </div>
                        <div
                          className="mx-auto max-w-3xl border border-slate-300 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.15)]"
                          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                        >
                          <div
                            className="relative"
                            style={
                              highlightActive
                                ? ({
                                    cursor: `url(${HIGHLIGHT_CURSOR}) 4 24, crosshair`,
                                  } as CSSProperties)
                                : undefined
                            }
                            onMouseDown={(event) => handleHighlightPointerDown(page.id, event)}
                            onMouseMove={(event) => handleHighlightPointerMove(page.id, event)}
                            onMouseUp={() => handleHighlightPointerUp(page.id)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={page.preview} alt={`Page ${idx + 1}`} className="w-full" />
                            <svg
                              className="absolute inset-0 h-full w-full"
                              style={{ pointerEvents: deleteMode ? "auto" : "none" }}
                              viewBox="0 0 1000 1000"
                              preserveAspectRatio="none"
                            >
                              {pageHighlights.map((stroke) =>
                                stroke.points.length > 1 ? (
                                  <polyline
                                    key={stroke.id}
                                    points={stroke.points
                                      .map((pt) => `${pt.x * 1000},${pt.y * 1000}`)
                                      .join(" ")}
                                    fill="none"
                                    stroke={stroke.color}
                                    strokeWidth={Math.max(1, stroke.thickness * 1000)}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeOpacity={0.4}
                                    style={{
                                      pointerEvents: deleteMode ? "stroke" : "none",
                                      cursor: deleteMode ? "pointer" : "default",
                                    }}
                                    onClick={(event) => {
                                      if (!deleteMode) return;
                                      event.preventDefault();
                                      event.stopPropagation();
                                      handleDeleteHighlight(page.id, stroke.id);
                                    }}
                                  />
                                ) : null
                              )}
                              {draftHighlight?.pageId === page.id &&
                              draftHighlight.points.length > 1 ? (
                                <polyline
                                  aria-hidden
                                  points={draftHighlight.points
                                    .map((pt) => `${pt.x * 1000},${pt.y * 1000}`)
                                    .join(" ")}
                                  fill="none"
                                  stroke={draftHighlight.color}
                                  strokeWidth={Math.max(1, draftHighlight.thickness * 1000)}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeOpacity={0.25}
                                />
                              ) : null}
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:w-64">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-inner">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">Page order</p>
                    <p className="text-xs text-slate-500">Tap to focus or drag to reorder</p>
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
                      <ul className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-4">
                        {pages.map((p, i) => (
                          <SortableThumb
                            key={p.id}
                            item={p}
                            index={i}
                            selected={p.id === activePageId}
                            onSelect={() => handleSelectPage(p.id)}
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && pages.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-12 text-center shadow-sm">
            <p className="text-base font-semibold text-gray-800">No pages yet</p>
            <p className="mt-2 text-sm text-gray-500">
              Go back to the homepage, upload your PDFs, and they will show up here instantly.
            </p>
            <p className="mt-6 text-xs uppercase tracking-[0.4em] text-gray-400">Workspace ready</p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-full border border-brand/30 bg-brand/5 px-5 py-2 text-sm font-semibold text-brand transition hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              onClick={handleAddClick}
            >
              Add pages
            </button>
            <input
              ref={addInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={handleAddChange}
            />
            <p className="text-sm text-gray-600">
              {pages.length > 0
                ? `Ready to download ${pages.length} ${pages.length === 1 ? "page" : "pages"}?`
                : "Add some pages to enable download."}
            </p>
          </div>
          <button
            className="rounded-full bg-[#024d7c] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:bg-[#013d63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c] focus-visible:ring-offset-2 active:bg-[#012f4e] disabled:cursor-not-allowed disabled:bg-[#d1e3f2] disabled:text-[#5f7085] disabled:shadow-none"
            onClick={handleDownload}
            disabled={downloadDisabled}
          >
            {busy ? "Building..." : "Download pages"}
          </button>
        </div>

        {pages.length > 0 && activePageIndex >= 0 && (
          <div className="pointer-events-none fixed bottom-24 left-6 z-30">
            <div className="pointer-events-auto flex items-center gap-4 rounded-full bg-[#1b2a3c] px-5 py-3 text-white shadow-xl shadow-black/25">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-white/70">Page</span>
                <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-base font-semibold">
                  <button
                    type="button"
                    aria-label="Previous page"
                    className="rounded-full p-1 transition hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent"
                    onClick={() => handlePageStep(-1)}
                    disabled={activePageIndex === 0}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span>{activePageIndex + 1}</span>
                  <span className="text-sm text-white/60">/ {pages.length}</span>
                  <button
                    type="button"
                    aria-label="Next page"
                    className="rounded-full p-1 transition hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent"
                    onClick={() => handlePageStep(1)}
                    disabled={activePageIndex === pages.length - 1}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Zoom out"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-lg transition hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent"
                  onClick={() =>
                    setZoom((z) =>
                      Math.max(minZoom, Number((z - zoomStep).toFixed(2)))
                    )
                  }
                  disabled={!canZoomOut}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/80 w-12 text-center">
                  {zoomLabel}
                </div>
                <button
                  type="button"
                  aria-label="Zoom in"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-lg transition hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent"
                  onClick={() =>
                    setZoom((z) =>
                      Math.min(maxZoom, Number((z + zoomStep).toFixed(2)))
                    )
                  }
                  disabled={!canZoomIn}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/** Disable SSR because pdfjs/canvas must run in the browser only */
export default dynamic(() => Promise.resolve(WorkspaceClient), { ssr: false });
