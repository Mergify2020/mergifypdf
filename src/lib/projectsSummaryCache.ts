"use client";

export type ProjectsSummaryProject = {
  id: string;
  name: string | null;
  updatedAt: string | number | Date;
  previewUrl?: string | null;
  pagesCount?: number | null;
};

let cachedSummary: ProjectsSummaryProject[] | null = null;

const SESSION_KEY = "mpdf:projects-summary-cache:v1";
const SESSION_MAX_AGE_MS = 60_000;

type StoredCache = { savedAt: number; projects: ProjectsSummaryProject[] };

export function getProjectsSummaryCache() {
  if (cachedSummary) return cachedSummary;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCache;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.savedAt !== "number" || !Array.isArray(parsed.projects)) return null;
    if (Date.now() - parsed.savedAt > SESSION_MAX_AGE_MS) return null;
    cachedSummary = parsed.projects;
    return cachedSummary;
  } catch {
    return null;
  }
}

export function setProjectsSummaryCache(projects: ProjectsSummaryProject[]) {
  cachedSummary = projects;
  if (typeof window === "undefined") return;
  try {
    const payload: StoredCache = { savedAt: Date.now(), projects };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
}

export function clearProjectsSummaryCache() {
  cachedSummary = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore storage failures
  }
}
