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

export function getProjectsSummaryCache(_ownerKey: string | null | undefined) {
  return null;
}

export function setProjectsSummaryCache(
  _ownerKey: string | null | undefined,
  _projects: ProjectsSummaryProject[]
) {
  // Intentionally no-op: project summaries must come directly from the DB.
}

export function clearProjectsSummaryCache(_ownerKey: string | null | undefined) {
  // Intentionally no-op: project summaries must come directly from the DB.
}

export function subscribeProjectsSummary(_listener: (update: ProjectsSummaryUpdate) => void) {
  return () => {};
}

export async function refreshProjectsSummary(ownerKey: string | null | undefined) {
  if (!ownerKey) return null;
  try {
    const res = await fetch("/api/projects?summary=1", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { projects?: ProjectsSummaryProject[] };
    if (!Array.isArray(data.projects)) return null;
    return data.projects;
  } catch {
    return null;
  }
}
