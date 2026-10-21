import { normalizeRotation } from "./studioPure";
import type { PageItem } from "./studioTypes";

export function getProjectCoverPreview(pages: PageItem[]): string | null {
  const candidate = pages[0]?.preview;
  return typeof candidate === "string" && candidate.startsWith("data:image/") ? candidate : null;
}

export function extractProjectRotationFromData(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const pages = Array.isArray((data as Record<string, unknown>).pages)
    ? ((data as Record<string, unknown>).pages as unknown[])
    : null;
  const first = pages?.[0];
  if (!first || typeof first !== "object") return 0;
  const rotation = (first as { rotation?: unknown }).rotation;
  return typeof rotation === "number" ? normalizeRotation(rotation) : 0;
}
