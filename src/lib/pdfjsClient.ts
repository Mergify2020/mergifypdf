"use client";

export type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf");

let pdfJsPromise: Promise<PdfJsModule> | null = null;

export function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist/legacy/build/pdf").then((pdfjsLib) => {
      const workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.js",
        import.meta.url,
      ).toString();
      if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      }
      return pdfjsLib;
    });
  }
  return pdfJsPromise;
}
