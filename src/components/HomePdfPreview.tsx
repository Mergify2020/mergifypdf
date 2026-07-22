"use client";

import { useEffect, useRef, useState } from "react";
import { loadPdfJs } from "@/lib/pdfjsClient";

const PREVIEW_MAX_WIDTH = 240;
const PREVIEW_MAX_HEIGHT = 320;

export default function HomePdfPreview({
  pdfUrl,
  rotation = 0,
}: {
  pdfUrl?: string | null;
  rotation?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    const startLoadingId = window.requestAnimationFrame(() => {
      if (!cancelled) setLoading(true);
    });
    ctx.fillStyle = "#222224";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!pdfUrl) {
      window.requestAnimationFrame(() => {
        if (!cancelled) setLoading(false);
      });
      window.cancelAnimationFrame(startLoadingId);
      return;
    }

    (async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        const doc = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
        const page = await doc.getPage(1);
        const normalizedRotation = ((rotation % 360) + 360) % 360;
        const baseViewport = page.getViewport({ scale: 1, rotation: normalizedRotation });
        const scale = Math.min(
          PREVIEW_MAX_WIDTH / baseViewport.width,
          PREVIEW_MAX_HEIGHT / baseViewport.height
        );
        const viewport = page.getViewport({ scale, rotation: normalizedRotation });
        const targetWidth = Math.max(1, Math.floor(viewport.width));
        const targetHeight = Math.max(1, Math.floor(viewport.height));
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        if (cancelled) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(startLoadingId);
    };
  }, [pdfUrl, rotation]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-2">
        <div
          className="relative flex items-center justify-center bg-[var(--app-surface)]"
          style={{ width: PREVIEW_MAX_WIDTH, height: PREVIEW_MAX_HEIGHT }}
        >
          <canvas
            ref={canvasRef}
            className="block"
            style={{ visibility: loading ? "hidden" : "visible" }}
          />
          {loading ? <div className="absolute inset-0 bg-[var(--app-surface)]" /> : null}
        </div>
      </div>
    </div>
  );
}
