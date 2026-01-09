"use client";

export type ProjectsSummaryProject = {
  id: string;
  name: string | null;
  updatedAt: string | number | Date;
  previewUrl?: string | null;
  pdfUrl?: string | null;
  pagesCount?: number | null;
  rotation?: number | null;
};

export type ProjectsSummaryUpdate = {
  ownerKey: string | null;
  projects: ProjectsSummaryProject[] | null;
};

let cachedSummaryOwner: string | null = null;
let cachedSummary: ProjectsSummaryProject[] | null = null;

const listeners = new Set<(update: ProjectsSummaryUpdate) => void>();

function emitUpdate(ownerKey: string | null | undefined, projects: ProjectsSummaryProject[] | null) {
  const payload: ProjectsSummaryUpdate = { ownerKey: ownerKey ?? null, projects };
  listeners.forEach((listener) => listener(payload));
}

export function getProjectsSummaryCache(ownerKey: string | null | undefined) {
  if (cachedSummary && cachedSummaryOwner === (ownerKey ?? null)) {
    return cachedSummary;
  }
  return null;
}

export function setProjectsSummaryCache(ownerKey: string | null | undefined, projects: ProjectsSummaryProject[]) {
  cachedSummaryOwner = ownerKey ?? null;
  cachedSummary = projects;
  emitUpdate(ownerKey, projects);
}

export function clearProjectsSummaryCache(ownerKey: string | null | undefined) {
  if (cachedSummaryOwner === (ownerKey ?? null)) {
    cachedSummaryOwner = null;
    cachedSummary = null;
  }
  cachedSummary = null;
  emitUpdate(ownerKey, null);
}

export function subscribeProjectsSummary(listener: (update: ProjectsSummaryUpdate) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshProjectsSummary(ownerKey: string | null | undefined, cache: RequestCache = "no-store") {
  if (!ownerKey) return null;
  try {
    const res = await fetch("/api/projects?summary=1", { cache });
    if (!res.ok) return null;
    const data = (await res.json()) as { projects?: ProjectsSummaryProject[] };
    if (!Array.isArray(data.projects)) return null;
    setProjectsSummaryCache(ownerKey, data.projects);
    return data.projects;
  } catch {
    return null;
  }
}
