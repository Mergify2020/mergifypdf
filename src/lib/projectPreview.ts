import { normalizePreviewUrl } from "@/lib/previewUrl";

type ProjectPreviewMeta = {
  previewUrl: string | null;
  pagesCount: number;
};

function parseProjectPayload(data: unknown): Record<string, unknown> | null {
  if (!data) return null;
  if (typeof data === "object") return data as Record<string, unknown>;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function derivePreviewMeta(data: unknown): ProjectPreviewMeta {
  let previewUrl: string | null = null;
  let pagesCount = 0;

  const payload = parseProjectPayload(data);
  if (!payload) return { previewUrl, pagesCount };

  previewUrl =
    normalizePreviewUrl(payload.previewUrl) ??
    normalizePreviewUrl(payload.firstPageThumb);

  if (!previewUrl && Array.isArray(payload.pageThumbs)) {
    previewUrl = normalizePreviewUrl(payload.pageThumbs[0]);
  }

  if (!previewUrl && Array.isArray(payload.pages) && payload.pages.length > 0) {
    const firstPage = payload.pages[0] as Record<string, unknown>;
    previewUrl = normalizePreviewUrl(firstPage.thumb) ?? normalizePreviewUrl(firstPage.preview);
  }

  if (typeof payload.pagesCount === "number" && Number.isFinite(payload.pagesCount)) {
    pagesCount = payload.pagesCount;
  } else if (Array.isArray(payload.pages)) {
    pagesCount = payload.pages.length;
  }

  return { previewUrl, pagesCount };
}
