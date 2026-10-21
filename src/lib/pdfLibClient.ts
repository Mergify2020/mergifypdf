"use client";

type PdfLibModule = typeof import("pdf-lib");

let pdfLibPromise: Promise<PdfLibModule> | null = null;

export function loadPdfLib() {
  pdfLibPromise ??= import("pdf-lib");
  return pdfLibPromise;
}
