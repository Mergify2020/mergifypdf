"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";

type PageThumb = { idx: number; thumb?: string; keep: boolean };
type FileRef = { url: string; name: string; size: number };

export default function Studio() {
  const [files, setFiles] = useState<FileRef[]>([]);
  const [pages, setPages] = useState<PageThumb[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files from landing page
  useEffect(() => {
    const raw = sessionStorage.getItem("mpdf:files");
    const arr: FileRef[] = raw ? JSON.parse(raw) : [];
    setFiles(arr);
  }, []);

  // Render thumbnails for ALL files (concatenate previews)
  useEffect(() => {
    async function renderAll() {
      if (files.length === 0) return;
      setLoading(true);
      try {
        const pdfjsLib = await import("pdfjs-dist");
        // @ts-ignore
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

        const next: PageThumb[] = [];
        for (const f of files) {
          const pdf = await pdfjsLib.getDocument(f.url).promise; // object URL
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.25 });
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d")!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport }).promise;
            next.push({
              idx: next.length,
              thumb: canvas.toDataURL("image/png"),
              keep: true,
            });
          }
        }
        setPages(next);
      } finally {
        setLoading(false);
      }
    }
    renderAll();
  }, [files]);

  const totalPages = useMemo(() => pages.length, [pages]);

  function selectAll(v: boolean) {
    setPages(prev => prev.map(p => ({ ...p, keep: v })));
  }

  function toggle(idx: number) {
    setPages(prev => prev.map(p => p.idx === idx ? { ...p, keep: !p.keep } : p));
  }

  async function addMore(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    const payload = list
      .filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
      .map(f => ({ url: URL.createObjectURL(f), name: f.name, size: f.size }));
    if (payload.length) {
      const merged = [...files, ...payload];
      setFiles(merged);
      sessionStorage.setItem("mpdf:files", JSON.stringify(merged));
    }
    e.currentTarget.value = "";
  }

  async function downloadResult() {
    try {
      if (files.length === 0 || pages.every(p => !p.keep)) return;
      setBusy(true);

      // Load & merge all files first
      const out = await PDFDocument.create();
      for (const f of files) {
        const srcBytes = new Uint8Array(await (await fetch(f.url)).arrayBuffer());
        const src = await PDFDocument.load(srcBytes);
        const copied = await out.copyPages(src, src.getPageIndices());
        copied.forEach(p => out.addPage(p));
      }

      // If user unchecked pages, rebuild in selected order (filter kept pages)
      const bytesAll = await out.save();
      const abAll = (bytesAll.buffer as ArrayBuffer).slice(bytesAll.byteOffset, bytesAll.byteOffset + bytesAll.byteLength);
      const merged = await PDFDocument.load(abAll);
      const indicesToKeep = pages
        .map((p, i) => ({ i, keep: p.keep }))
        .filter(x => x.keep)
        .map(x => x.i);

      const finalDoc = await PDFDocument.create();
      const finalPages = await finalDoc.copyPages(merged, indicesToKeep);
      finalPages.forEach(p => finalDoc.addPage(p));
      const finalBytes = await finalDoc.save();

      // TS-safe Blob
      const ab = (finalBytes.buffer as ArrayBuffer).slice(finalBytes.byteOffset, finalBytes.byteOffset + finalBytes.byteLength);
      const view = new Uint8Array(ab);
      const blob = new Blob([view], { type: "application/pdf" });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MergifyPDF-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Studio</h1>
        <span className="text-sm text-gray-500">Files: {files.length} • Pages: {totalPages}</span>
        <div className="ml-auto flex gap-2">
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => selectAll(true)}>Select all</button>
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => selectAll(false)}>Select none</button>
          <button
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-white disabled:opacity-60"
            onClick={downloadResult}
            disabled={busy || loading || pages.every(p => !p.keep)}
          >
            {busy ? "Building…" : "Download"}
          </button>
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => fileInputRef.current?.click()}>
            Add pages (upload)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={addMore}
          />
        </div>
      </header>

      <p className="text-sm text-gray-600 mt-1">
        Preview pages below. Uncheck to remove. Use “Add pages” to append more PDFs; then Download.
      </p>

      <section className="mt-5">
        {loading && <div className="text-sm text-gray-600">Rendering pages…</div>}
        {!loading && pages.length === 0 && (
          <div className="rounded-xl border p-6 text-sm text-gray-500">No pages yet. Upload on the landing page.</div>
        )}
        {!loading && pages.length > 0 && (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {pages.map(p => (
              <li key={p.idx} className={`rounded-lg border p-2 ${!p.keep ? "opacity-40" : ""}`}>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={p.keep} onChange={() => toggle(p.idx)} aria-label={`Keep page ${p.idx+1}`} />
                  <div className="text-xs">
                    <div className="text-gray-700 font-medium mb-1">Page {p.idx + 1}</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.thumb ? (
                      <img src={p.thumb} alt={`Thumbnail page ${p.idx+1}`} className="w-full h-auto rounded border" />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-gray-100 rounded" />
                    )}
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
