"use client";

import { loadPdfJs } from "@/lib/pdfjsClient";

const PREVIEW_MAX_WIDTH = 240;
const PREVIEW_MAX_HEIGHT = 320;

async function renderPreviewDataUrl(file: File) {
  const pdfjsLib = await loadPdfJs();

  const bytes = await file.arrayBuffer();
  let doc: Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]> | null = null;
  try {
    doc = await pdfjsLib.getDocument({ data: bytes } as never).promise;
  } catch {
    try {
      doc = await pdfjsLib.getDocument({ data: bytes, disableWorker: true } as never).promise;
    } catch {
      return null;
    }
  }

  const page = await doc.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(
    PREVIEW_MAX_WIDTH / baseViewport.width,
    PREVIEW_MAX_HEIGHT / baseViewport.height,
  );
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  await page.render({ canvasContext: ctx, viewport }).promise;

  return canvas.toDataURL("image/webp", 0.82);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadPreviewWithRetry(projectId: string, previewUrl: string, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewUrl }),
      });
      if (!res.ok) {
        throw new Error(`Preview upload failed with status ${res.status}`);
      }
      return;
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) {
        await sleep(250 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

export async function uploadProjectPreviewFromFile(
  file: File | null | undefined,
  projectId: string,
) {
  if (!file) return;
  try {
    const previewUrl = await renderPreviewDataUrl(file);
    if (!previewUrl) return;
    await uploadPreviewWithRetry(projectId, previewUrl);
  } catch {
    // ignore preview failures
  }
}
