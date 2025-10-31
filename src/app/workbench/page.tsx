"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { useDropzone } from "react-dropzone";

type FileRow = { id: string; file: File };
const bytesToMB = (b: number) => (b / (1024 * 1024)).toFixed(2) + " MB";

export default function Workbench() {
  const [items, setItems] = useState<FileRow[]>([]);
  const [busy, setBusy] = useState<"idle" | "merging">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const pdfs = accepted.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    const rows = pdfs.map((f) => ({ id: crypto.randomUUID(), file: f }));
    setItems((prev) => [...prev, ...rows]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    onDrop,
    multiple: true,
    noClick: true,
  });

  const totalSize = useMemo(() => items.reduce((s, r) => s + r.file.size, 0), [items]);

  function remove(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
  }
  function moveUp(id: string) {
    setItems((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const [row] = copy.splice(idx, 1);
      copy.splice(idx - 1, 0, row);
      return copy;
    });
  }
  function moveDown(id: string) {
    setItems((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const copy = [...prev];
      const [row] = copy.splice(idx, 1);
      copy.splice(idx + 1, 0, row);
      return copy;
    });
  }

  async function handleMerge() {
    try {
      setBusy("merging");
      setError(null);
      if (items.length === 0) {
        setError("Add at least one PDF.");
        return;
      }
      const mergedPdf = await PDFDocument.create();
      for (const { file } of items) {
        const buf = await file.arrayBuffer();
        const src = await PDFDocument.load(buf);
        const copied = await mergedPdf.copyPages(src, src.getPageIndices());
        copied.forEach((p) => mergedPdf.addPage(p));
      }
      const bytes = await mergedPdf.save(); // Uint8Array

// Create a real ArrayBuffer slice, then a plain Uint8Array view.
// Casting to ArrayBuffer avoids the SharedArrayBuffer union that upsets TS on Vercel.
const ab = (bytes.buffer as ArrayBuffer).slice(
  bytes.byteOffset,
  bytes.byteOffset + bytes.byteLength
);
const view = new Uint8Array(ab);
const blob = new Blob([view], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MergifyPDF-merged-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("Merge failed. Try removing any unusually large or encrypted PDFs.");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-semibold">MergifyPDF — Workbench</h1>
      <p className="text-sm text-gray-600 mt-1">
        Add PDFs, reorder, then <strong>Merge</strong>. (Everything processes in your browser.)
      </p>

      <section
        {...getRootProps()}
        className={`mt-6 rounded-2xl border-2 border-dashed p-8 text-center outline-none transition
        ${isDragActive ? "border-blue-600 bg-blue-50" : "border-gray-300"}`}
      >
        <input {...getInputProps()} aria-label="Drop PDFs here" />
        <div className="space-y-3">
          <p className="text-base">Drag & drop PDFs here</p>
          <p className="text-xs text-gray-500">or</p>
          <button
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            onClick={(e) => {
              e.preventDefault();
              inputRef.current?.click();
            }}
          >
            Choose files
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              onDrop(files);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Files ({items.length})</h2>
          <span className="text-xs text-gray-500">Total: {bytesToMB(totalSize)}</span>
        </div>

        <ul className="mt-3 divide-y rounded-xl border">
          {items.length === 0 && <li className="p-4 text-sm text-gray-500">No files added yet.</li>}
          {items.map((r, idx) => (
            <li key={r.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{idx + 1}. {r.file.name}</p>
                <p className="text-xs text-gray-500">{bytesToMB(r.file.size)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => moveUp(r.id)}>↑</button>
                <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => moveDown(r.id)}>↓</button>
                <button className="rounded-lg border px-3 py-1 text-sm text-red-600" onClick={() => remove(r.id)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 flex items-center justify-between">
        <div aria-live="polite" className="text-sm text-red-600">{error}</div>
        <button
          className="rounded-xl bg-blue-600 px-5 py-2 text-white disabled:opacity-60"
          onClick={handleMerge}
          disabled={busy === "merging" || items.length === 0}
          aria-busy={busy === "merging"}
        >
          {busy === "merging" ? "Merging…" : "Merge & Download"}
        </button>
      </section>
    </main>
  );
}
