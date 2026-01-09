"use client";

export type ProjectsSummaryProject = {
  id: string;
  name: string | null;
  updatedAt: string | number | Date;
  previewUrl?: string | null;
  pagesCount?: number | null;
};

export type ProjectsSummaryUpdate = {
  ownerKey: string | null;
  projects: ProjectsSummaryProject[] | null;
};

let cachedSummaryOwner: string | null = null;
let cachedSummary: ProjectsSummaryProject[] | null = null;
const previewInFlight = new Set<string>();

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
    void primeMissingPreviews(ownerKey, data.projects);
    return data.projects;
  } catch {
    return null;
  }
}

async function primeMissingPreviews(
  ownerKey: string | null | undefined,
  projects: ProjectsSummaryProject[]
) {
  if (!ownerKey) return;
  const targets = projects
    .filter((project) => !project.previewUrl)
    .slice(0, 6);
  await Promise.all(
    targets.map(async (project) => {
      if (previewInFlight.has(project.id)) return;
      previewInFlight.add(project.id);
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/preview`, {
          method: "POST",
          credentials: "include",
        });
        const json = (await res.json().catch(() => null)) as { previewUrl?: string } | null;
        if (!res.ok || !json?.previewUrl) return;
        if (!cachedSummary || cachedSummaryOwner !== (ownerKey ?? null)) return;
        const next = cachedSummary.map((entry) =>
          entry.id === project.id ? { ...entry, previewUrl: json.previewUrl } : entry
        );
        setProjectsSummaryCache(ownerKey, next);
      } finally {
        previewInFlight.delete(project.id);
      }
    })
  );
}
