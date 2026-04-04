"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type RenderedPage = {
  height: number;
  index: number;
  url: string;
  width: number;
};

export default function PrintPage() {
  const searchParams = useSearchParams();
  const src = searchParams.get("src") ?? "";
  const title = searchParams.get("title") ?? "Document";
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printDialogClosed, setPrintDialogClosed] = useState(false);
  const didAutoPrintRef = useRef(false);

  const safeTitle = useMemo(() => {
    const trimmed = title.trim();
    return trimmed.length > 0 ? trimmed : "Document";
  }, [title]);

  useEffect(() => {
    document.title = `${safeTitle} - Print`;
  }, [safeTitle]);

  useEffect(() => {
    if (!src) return;

    let cancelled = false;
    const objectUrls: string[] = [];
    setLoading(true);
    setError(null);
    setPages([]);

    const render = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
        const workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.js",
          import.meta.url
        ).toString();
        if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
        }

        const response = await fetch(src, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load PDF (${response.status})`);
        }

        const bytes = await response.arrayBuffer();
        let doc: Awaited<ReturnType<typeof pdfjsLib.getDocument>>["promise"] extends Promise<infer T> ? T : never;

        try {
          doc = await pdfjsLib.getDocument({ data: bytes } as never).promise;
        } catch {
          doc = await pdfjsLib.getDocument({ data: bytes, disableWorker: true } as never).promise;
        }

        const nextPages: RenderedPage[] = [];
        for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex += 1) {
          const page = await doc.getPage(pageIndex);
          const baseViewport = page.getViewport({ scale: 1 });
          const maxWidth = typeof window !== "undefined" ? Math.min(window.innerWidth - 64, 1100) : 1100;
          const scale = Math.max(1, Math.min(maxWidth / baseViewport.width, 2));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/png");
          });
          if (!blob) continue;

          const objectUrl = URL.createObjectURL(blob);
          objectUrls.push(objectUrl);
          nextPages.push({
            index: pageIndex,
            url: objectUrl,
            width: canvas.width,
            height: canvas.height,
          });
        }

        if (!cancelled) {
          setPages(nextPages);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Unable to prepare this document for printing.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [src]);

  useEffect(() => {
    if (loading || error || pages.length === 0) return;
    if (didAutoPrintRef.current) return;

    didAutoPrintRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [error, loading, pages.length]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintDialogClosed(true);
      window.close();
    };

    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  if (!src) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-slate-700">
        <p>Missing PDF source.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white print:bg-white">
      <style jsx global>{`
        @page {
          margin: 12mm;
        }

        html,
        body {
          background: white !important;
        }

        @media print {
          body {
            background: white !important;
          }

          [data-print-status] {
            display: none !important;
          }

          [data-print-toolbar] {
            display: none !important;
          }

          [data-print-shell] {
            padding: 0 !important;
            background: white !important;
          }

          [data-print-page] {
            margin: 0 0 12mm 0 !important;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }

        @media screen {
          [data-print-shell] {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }

          [data-print-page] {
            display: none !important;
          }
        }
      `}</style>

      <div data-print-shell className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-6 sm:px-6">
        {!error ? (
          <div
            data-print-status
            className="px-6 py-12 text-center text-sm font-medium text-slate-500"
          >
            {printDialogClosed ? "Print cancelled." : "Preparing print..."}
          </div>
        ) : null}

        {error ? (
          <div
            data-print-status
            className="mx-auto w-full max-w-sm rounded-3xl border border-rose-200 bg-white px-6 py-8 text-center text-sm font-medium text-rose-600 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
          >
            {error}
          </div>
        ) : null}

        {!loading && !error
          ? pages.map((page) => (
              <section
                key={page.index}
                data-print-page
                className="overflow-hidden bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.url}
                  alt={`${safeTitle} page ${page.index}`}
                  className="block h-auto w-full"
                  width={page.width}
                  height={page.height}
                />
              </section>
            ))
          : null}
      </div>
    </main>
  );
}
