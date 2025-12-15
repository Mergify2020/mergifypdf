"use client";

export type ProjectsSummaryProject = {
  id: string;
  name: string | null;
  updatedAt: string | number | Date;
  previewUrl?: string | null;
  pagesCount?: number | null;
};

export const PROJECTS_SUMMARY_EVENT = "mpdf:projects-summary-updated";

let cachedSummaryOwner: string | null = null;
let cachedSummary: ProjectsSummaryProject[] | null = null;

const SESSION_KEY_PREFIX = "mpdf:projects-summary-cache:v2:";
const SESSION_MAX_AGE_MS = 60_000;

type StoredCache = { savedAt: number; projects: ProjectsSummaryProject[] };

function storageKey(ownerKey: string | null | undefined) {
  return `${SESSION_KEY_PREFIX}${ownerKey ?? "anon"}`;
}

function eventKey(ownerKey: string | null | undefined) {
  return `${PROJECTS_SUMMARY_EVENT}:${ownerKey ?? "anon"}`;
}

function emitUpdate(ownerKey: string | null | undefined) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(eventKey(ownerKey)));
}

export function getProjectsSummaryCache(ownerKey: string | null | undefined) {
  if (cachedSummary && cachedSummaryOwner === (ownerKey ?? null)) return cachedSummary;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(ownerKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCache;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.savedAt !== "number" || !Array.isArray(parsed.projects)) return null;
    if (Date.now() - parsed.savedAt > SESSION_MAX_AGE_MS) return null;
    cachedSummaryOwner = ownerKey ?? null;
    cachedSummary = parsed.projects;
    return cachedSummary;
  } catch {
    return null;
  }
}

export function setProjectsSummaryCache(ownerKey: string | null | undefined, projects: ProjectsSummaryProject[]) {
  cachedSummaryOwner = ownerKey ?? null;
  cachedSummary = projects;
  if (typeof window === "undefined") return;
  try {
    const payload: StoredCache = { savedAt: Date.now(), projects };
    window.sessionStorage.setItem(storageKey(ownerKey), JSON.stringify(payload));
    emitUpdate(ownerKey);
  } catch {
    // ignore storage failures
  }
}

export function clearProjectsSummaryCache(ownerKey: string | null | undefined) {
  if (cachedSummaryOwner === (ownerKey ?? null)) {
    cachedSummaryOwner = null;
    cachedSummary = null;
  }
  cachedSummary = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(ownerKey));
    emitUpdate(ownerKey);
  } catch {
    // ignore storage failures
  }
}

export async function refreshProjectsSummary(ownerKey: string | null | undefined, cache: RequestCache = "no-store") {
  if (typeof window === "undefined") return null;
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
