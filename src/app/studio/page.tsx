"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { PDFDocument } from "pdf-lib";
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
const PREVIEW_BASE_SCALE = 1.35;
const MAX_DEVICE_PIXEL_RATIO = 2.5;
const THUMB_MAX_WIDTH = 200;
const PREVIEW_IMAGE_QUALITY = 0.95;

function getDevicePixelRatio() {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio ? Math.min(window.devicePixelRatio, MAX_DEVICE_PIXEL_RATIO) : 1;
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

  const addInputRef = useRef<HTMLInputElement>(null);
  const renderedSourcesRef = useRef(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewNodeMap = useRef<Map<string, HTMLDivElement>>(new Map());

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
        const pdfjsLib = await import("pdfjs-dist");
        // @ts-ignore
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

  function resetZoom() {
    setZoom(1);
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f3fbff,_#ffffff)] pt-16">
      <h1 className="mx-auto mt-6 max-w-6xl px-4 text-3xl font-semibold tracking-tight text-slate-900 lg:px-6">
        Workspace
      </h1>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-4 pb-32 lg:px-6 lg:pt-6">
        <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm shadow-slate-200/60 backdrop-blur">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-[220px] flex-1 space-y-4">
              <p className="text-sm text-gray-600">
                Drag thumbnails to reorder them, or upload more PDFs to keep building your stack.
              </p>
              <div className="flex flex-wrap gap-2 text-sm font-medium text-gray-700">
                <span className="rounded-full bg-slate-100 px-3 py-1">Files: {sources.length}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Pages: {pages.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full border border-brand/30 bg-brand/5 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                onClick={handleAddClick}
              >
                Add pages (upload)
              </button>
              <input
                ref={addInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={handleAddChange}
              />
            </div>
            <p className="text-sm text-gray-600 lg:ml-auto">
              {pages.length === 0
                ? 'Start by uploading PDFs from the homepage; they will appear here automatically.'
                : 'Need more content? Upload another PDF—the current order stays intact.'}
            </p>
          </div>
        </div>

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
                  {pages.map((page, idx) => (
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <div
                        className="mx-auto max-w-3xl border border-slate-300 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.15)]"
                        style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={page.preview}
                          alt={`Page ${idx + 1}`}
                          className="w-full"
                        />
                      </div>
                    </div>
                  ))}
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
          <p className="text-sm text-gray-600">
            {pages.length > 0
              ? `Ready to download ${pages.length} ${pages.length === 1 ? "page" : "pages"}?`
              : "Add some pages to enable download."}
          </p>
          <button
            className="rounded-full bg-[#2A7C7C] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#1a4d4d]/30 transition hover:bg-[#256b6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A7C7C] focus-visible:ring-offset-2 active:bg-[#1f5d5d] disabled:cursor-not-allowed disabled:bg-[#dfeeee] disabled:text-[#6c8c8c] disabled:shadow-none"
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
                <button
                  type="button"
                  aria-label="Reset zoom"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 transition hover:bg-white/20"
                  onClick={resetZoom}
                  disabled={Math.abs(zoom - 1) < 0.05}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 6h9v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 19l13-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <span className="ml-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12c0-1.1.9-2 2-2h2v-1a2 2 0 114 0v1h1.5a2.5 2.5 0 012.5 2.5v1.2c0 1.32-.74 2.53-1.91 3.15l-2.47 1.3a4 4 0 01-1.81.44H10a4 4 0 01-4-4z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
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
