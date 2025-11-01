"use client";

import LogoutButton from "@/components/LogoutButton";

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
      className={`rounded-xl border p-2 ${!item.keep ? "opacity-45" : ""}`}
    >
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={item.keep}
          onChange={() => toggleKeep(index)}
          aria-label={`Keep page ${index + 1}`}
        />
        <div className="text-xs w-full">
          <div className="text-gray-700 font-medium mb-1">Page {index + 1}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumb}
            alt={`Page ${index + 1}`}
            className="w-full h-auto rounded-md border pointer-events-none"
          />
        </div>
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

  /** Render thumbnails whenever sources change (or when we add more PDFs) */
  useEffect(() => {
    if (sources.length === 0) return;

    let cancelled = false;
    async function renderAll() {
      setLoading(true);
      setError(null);
      const next: PageItem[] = [];

      try {
        // Import pdf.js in the browser only
        const pdfjsLib = await import("pdfjs-dist");
        // @ts-ignore
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

        // Build thumbs for each source in order
        for (let s = 0; s < sources.length; s++) {
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
        if (!cancelled) setPages(next);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not render previews (file may be encrypted or corrupted).");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderAll();
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

  return (
    <main className="mx-auto max-w-6xl p-6">
      {/* Top-right Sign Out */}
      <div className="flex justify-end mb-4">
        <LogoutButton />
      </div>

      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Studio</h1>
        <span className="text-sm text-gray-600">
          Files: {sources.length} • Pages: {pages.length}
        </span>
        <div className="ml-auto flex gap-2">
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => selectAll(true)}>
            Select all
          </button>
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => selectAll(false)}>
            Select none
          </button>
          <button
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-white disabled:opacity-60"
            onClick={handleDownload}
            disabled={busy || pages.length === 0 || pages.every((p) => !p.keep)}
          >
            {busy ? "Building…" : "Download"}
          </button>
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={handleAddClick}>
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
      </header>

      <p className="text-sm text-gray-600 mt-1">
        Drag to reorder pages. Uncheck to remove. Use “Add pages” to append more PDFs; then Download.
      </p>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="mt-4 text-sm text-gray-600">Rendering previews…</div>}

      {!loading && pages.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={itemsIds} strategy={rectSortingStrategy}>
            <ul className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {pages.map((p, i) => (
                <SortableThumb key={p.id} item={p} index={i} toggleKeep={toggleKeep} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {!loading && pages.length === 0 && (
        <div className="mt-6 rounded-xl border p-6 text-sm text-gray-500">
          No pages yet. Go to the homepage and upload PDFs.
        </div>
      )}
    </main>
  );
}

/** Disable SSR because pdfjs/canvas must run in the browser only */
export default dynamic(() => Promise.resolve(StudioClient), { ssr: false });
