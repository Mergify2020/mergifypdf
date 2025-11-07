"use client";

import SettingsMenu from "@/components/SettingsMenu";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SourceRef = { url: string; name: string; size: number };
type PageItem = {
  id: string;
  srcIdx: number; // which source file
  pageIdx: number; // page index inside that source
  thumb: string; // data URL for preview
  keep: boolean; // selected or not
};

/** One sortable thumbnail tile */
function SortableThumb({
  item,
  index,
  toggleKeep,
}: {
  item: PageItem;
  index: number;
  toggleKeep: (i: number) => void;
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
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 focus-within:ring-2 focus-within:ring-brand/30 ${
        !item.keep ? "opacity-50" : ""
      }`}
    >
      <label className="flex cursor-pointer select-none flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="text-sm font-semibold text-gray-800">Page {index + 1}</span>
          <input
            type="checkbox"
            checked={item.keep}
            onChange={() => toggleKeep(index)}
            aria-label={`Keep page ${index + 1}`}
            className="h-4 w-4 rounded border-slate-300 text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumb}
          alt={`Page ${index + 1}`}
          className="pointer-events-none w-full rounded-xl border border-slate-100 bg-slate-50 shadow-sm"
        />
      </label>
    </li>
  );
}

function StudioClient() {
  const [sources, setSources] = useState<SourceRef[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);
  const renderedSourcesRef = useRef(0);

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

        // Only render thumbnails for sources we haven't seen yet
        for (let s = startIdx; s < sources.length; s++) {
          const src = sources[s];
          const pdf = await pdfjsLib.getDocument(src.url).promise;
          for (let p = 1; p <= pdf.numPages; p++) {
            if (cancelled) return;
            const page = await pdf.getPage(p);
            const viewport = page.getViewport({ scale: 0.25 });
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d")!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport }).promise;

            next.push({
              id: crypto.randomUUID(),
              srcIdx: s,
              pageIdx: p - 1,
              thumb: canvas.toDataURL("image/png"),
              keep: true,
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

  /** Toggle select */
  function toggleKeep(i: number) {
    setPages((prev) => prev.map((p, idx) => (idx === i ? { ...p, keep: !p.keep } : p)));
  }

  /** Select all / none */
  function selectAll(v: boolean) {
    setPages((prev) => prev.map((p) => ({ ...p, keep: v })));
  }

  /** Remove pages that are currently unchecked */
  function handleDeleteSelected() {
    setPages((prev) => {
      const kept = prev.filter((p) => p.keep);
      return kept.length === prev.length ? prev : kept;
    });
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
      if (pages.length === 0) return;
      const kept = pages.filter((p) => p.keep);
      if (kept.length === 0) {
        setError("Select at least one page.");
        return;
      }
      setBusy(true);
      setError(null);

      // Load each unique source once into a PDFDocument, cache in a map
      const docCache = new Map<number, PDFDocument>();
      for (const p of kept) {
        if (!docCache.has(p.srcIdx)) {
          const srcUrl = sources[p.srcIdx].url;
          const ab = await (await fetch(srcUrl)).arrayBuffer();
          const srcDoc = await PDFDocument.load(new Uint8Array(ab));
          docCache.set(p.srcIdx, srcDoc);
        }
      }

      // Now copy selected pages in the displayed order
      const out = await PDFDocument.create();
      for (const p of kept) {
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
  const keptCount = useMemo(() => pages.filter((p) => p.keep).length, [pages]);
  const removableCount = useMemo(() => pages.filter((p) => !p.keep).length, [pages]);
  const downloadDisabled = busy || keptCount === 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f3fbff,_#ffffff)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-10 pb-32 lg:px-6 lg:pt-14">
        <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm shadow-slate-200/60 backdrop-blur">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-[220px] flex-1 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand">Workspace</p>
                <div className="mt-3 flex flex-wrap items-baseline gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Studio</h1>
                  <span className="text-sm text-gray-500">Curate every page before you merge.</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Drag thumbnails to reorder them, uncheck a page to skip it, or upload more PDFs to keep building your
                stack.
              </p>
              <div className="flex flex-wrap gap-2 text-sm font-medium text-gray-700">
                <span className="rounded-full bg-slate-100 px-3 py-1">Files: {sources.length}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Pages: {pages.length}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Selected: {keptCount}</span>
              </div>
            </div>
            <div className="ml-auto shrink-0">
              <SettingsMenu />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                onClick={() => selectAll(true)}
              >
                Select all
              </button>
              <button
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                onClick={() => selectAll(false)}
              >
                Select none
              </button>
              <button
                className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleDeleteSelected}
                disabled={removableCount === 0}
              >
                Delete selected ({removableCount})
              </button>
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
                : 'Need more content? Upload another PDF—the current order stays intact. Uncheck any extras, then delete them to keep things tidy.'}
            </p>
          </div>
          <p className="text-xs text-gray-500">
            Tip: checkboxes control what goes into your merge. Uncheck the pages you no longer need, then use "Delete selected" to remove them from the Studio entirely.
          </p>
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={itemsIds} strategy={rectSortingStrategy}>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {pages.map((p, i) => (
                    <SortableThumb key={p.id} item={p} index={i} toggleKeep={toggleKeep} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {!loading && pages.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-12 text-center shadow-sm">
            <p className="text-base font-semibold text-gray-800">No pages yet</p>
            <p className="mt-2 text-sm text-gray-500">
              Go back to the homepage, upload your PDFs, and they will show up here instantly.
            </p>
            <p className="mt-6 text-xs uppercase tracking-[0.4em] text-gray-400">Studio ready</p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <p className="text-sm text-gray-600">
            {keptCount > 0
              ? `Ready to download ${keptCount} ${keptCount === 1 ? "page" : "pages"}?`
              : "Select at least one page to enable download."}
          </p>
          <button
            className="rounded-full bg-brand px-8 py-3 text-base font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-[#256b6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:bg-[#1f5d5d] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleDownload}
            disabled={downloadDisabled}
          >
            {busy ? "Building..." : "Download selected pages"}
          </button>
        </div>
      </div>
    </main>
  );
}

/** Disable SSR because pdfjs/canvas must run in the browser only */
export default dynamic(() => Promise.resolve(StudioClient), { ssr: false });
