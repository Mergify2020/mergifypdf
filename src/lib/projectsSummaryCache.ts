"use client";

export type ProjectsSummaryProject = {
  id: string;
  name: string | null;
  updatedAt: string | number | Date;
  hasPreview?: boolean;
  hasPdf?: boolean;
  pagesCount?: number | null;
  rotation?: number | null;
};

export type ProjectsSummaryUpdate = {
  ownerKey: string | null;
  projects: ProjectsSummaryProject[] | null;
};

type CacheEntry = {
  projects: ProjectsSummaryProject[];
  fetchedAt: number;
};

const CACHE_MAX_AGE_MS = 120_000;
const CACHE_PREFIX = "mpdf:projects-summary:";
const memoryCache = new Map<string, CacheEntry>();
const listeners = new Set<(update: ProjectsSummaryUpdate) => void>();

function getCacheKey(ownerKey: string | null | undefined) {
  return ownerKey ? `${CACHE_PREFIX}${ownerKey}` : null;
}

function readStorage(ownerKey: string) {
  try {
    const raw = window.sessionStorage?.getItem(getCacheKey(ownerKey) ?? "");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || !Array.isArray(parsed.projects) || typeof parsed.fetchedAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(ownerKey: string, entry: CacheEntry) {
  try {
    window.sessionStorage?.setItem(getCacheKey(ownerKey) ?? "", JSON.stringify(entry));
  } catch {
    // ignore storage failures
  }
}

function notify(update: ProjectsSummaryUpdate) {
  listeners.forEach((listener) => {
    listener(update);
  });
}

export function getProjectsSummaryCache(ownerKey: string | null | undefined) {
  if (!ownerKey || typeof window === "undefined") return null;
  const now = Date.now();
  const existing = memoryCache.get(ownerKey) ?? readStorage(ownerKey);
  if (!existing) return null;
  if (now - existing.fetchedAt > CACHE_MAX_AGE_MS) return null;
  memoryCache.set(ownerKey, existing);
  return existing.projects;
}

export function setProjectsSummaryCache(
  ownerKey: string | null | undefined,
  projects: ProjectsSummaryProject[]
) {
  if (!ownerKey || typeof window === "undefined") return;
  const entry = { projects, fetchedAt: Date.now() };
  memoryCache.set(ownerKey, entry);
  writeStorage(ownerKey, entry);
  notify({ ownerKey, projects });
}

export function clearProjectsSummaryCache(ownerKey: string | null | undefined) {
  if (!ownerKey || typeof window === "undefined") return;
  memoryCache.delete(ownerKey);
  try {
    window.sessionStorage?.removeItem(getCacheKey(ownerKey) ?? "");
  } catch {
    // ignore storage failures
  }
  notify({ ownerKey, projects: null });
}

export function subscribeProjectsSummary(listener: (update: ProjectsSummaryUpdate) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshProjectsSummary(ownerKey: string | null | undefined) {
  if (!ownerKey) return null;
  try {
    const res = await fetch("/api/projects?summary=1", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { projects?: ProjectsSummaryProject[] };
    if (!Array.isArray(data.projects)) return null;
    setProjectsSummaryCache(ownerKey, data.projects);
    return data.projects;
  } catch {
    return null;
  }
}
