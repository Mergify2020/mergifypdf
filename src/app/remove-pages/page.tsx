"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { PDFDocument } from "pdf-lib";

type PageItem = { index: number; thumb?: string; selected: boolean };

/**
 * We render the actual UI in a Client-only component and disable SSR
 * so Next never tries to bundle `pdfjs-dist` on the server (which pulls native `canvas`).
 */
function RemovePagesClient() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderThumbs() {
      if (!file) return;
      setError(null);
      setLoading(true);

      try {
        // 🔸 Import pdf.js ONLY in the browser at runtime
        const pdfjsLib = await import("pdfjs-dist");
        // @ts-ignore set worker from CDN to avoid bundling the worker
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

        const count = pdf.numPages;
        const next: PageItem[] = [];

        for (let i = 1; i <= count; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.25 }); // thumbnail scale
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport }).promise;
          next.push({ index: i - 1, thumb: canvas.toDataURL("image/png"), selected: true });
        }

        if (!cancelled) setPages(next);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Could not render that PDF (maybe encrypted or corrupted).");
          setPages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderThumbs();
    return () => {
      cancelled = true;
    };
  }, [file]);

  async function downloadTrimmed() {
    try {
      if (!file) return;
      const keep = pages.filter((p) => p.selected).map((p) => p.index);
      if (keep.length === 0) {
        setError("Select at least one page.");
        return;
      }
      setBusy(true);
      setError(null);

      const src = await PDFDocument.load(await file.arrayBuffer());
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, keep);
      copied.forEach((p) => out.addPage(p));
      const bytes = await out.save();

      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, "")}-trimmed.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("Failed to generate the new PDF. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function selectAll(v: boolean) {
    setPages((prev) => prev.map((p) => ({ ...p, selected: v })));
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-semibold">Remove Pages</h1>
      <p className="text-sm text-gray-600 mt-1">
        Upload a PDF, uncheck pages you don’t want, then download. (All processing happens in your browser.)
      </p>

      <div className="mt-6 rounded-2xl border-2 border-dashed p-8 text-center">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setFile(f);
            setPages([]);
            e.currentTarget.value = "";
          }}
        />
        <button
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          onClick={() => inputRef.current?.click()}
        >
          {file ? "Choose different PDF" : "Choose PDF"}
        </button>
        {file && <p className="text-xs text-gray-500 mt-2">{file.name}</p>}
      </div>

      {file && (
        <div className="mt-4 flex items-center gap-2">
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => selectAll(true)}>
            Select all
          </button>
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => selectAll(false)}>
            Select none
          </button>
          <button
            className="ml-auto rounded-xl bg-blue-600 px-5 py-2 text-white disabled:opacity-60"
            onClick={downloadTrimmed}
            disabled={busy || loading || pages.length === 0}
          >
            {busy ? "Building…" : "Download"}
          </button>
        </div>
      )}

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      <section className="mt-4">
        {loading && <p className="text-sm text-gray-600">Rendering pages…</p>}
        {!loading && pages.length > 0 && (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {pages.map((p) => (
              <li key={p.index} className="rounded-lg border p-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={p.selected}
                    onChange={(e) =>
                      setPages((prev) =>
                        prev.map((x) => (x.index === p.index ? { ...x, selected: e.target.checked } : x))
                      )
                    }
                    aria-label={`Include page ${p.index + 1}`}
                  />
                  <div className="text-xs">
                    <div className="text-gray-700 font-medium mb-1">Page {p.index + 1}</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.thumb ? (
                      <img
                        src={p.thumb}
                        alt={`Thumbnail of page ${p.index + 1}`}
                        className="w-full h-auto rounded-md border"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-gray-100 rounded-md" />
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

/** Export the client-only component with SSR disabled */
export default dynamic(() => Promise.resolve(RemovePagesClient), { ssr: false });
