export type RecentProjectEntry = {
  id: string;
  title: string;
  updatedAt: number;
};

export const RECENT_PROJECTS_STORAGE_KEY = "mpdf:recent-projects";
export const RECENT_PROJECTS_EVENT = "mpdf:recent-projects-updated";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function storageKey(ownerId: string | null | undefined) {
  return `${RECENT_PROJECTS_STORAGE_KEY}:${ownerId ?? "anon"}`;
}

export function loadRecentProjects(ownerId: string | null | undefined): RecentProjectEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(ownerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry?.id === "string" && typeof entry?.title === "string");
  } catch {
    return [];
  }
}

export function saveRecentProjects(ownerId: string | null | undefined, projects: RecentProjectEntry[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(storageKey(ownerId), JSON.stringify(projects));
    window.dispatchEvent(new Event(`${RECENT_PROJECTS_EVENT}:${ownerId ?? "anon"}`));
  } catch {
    // ignore storage failures
  }
}

export function addRecentProject(ownerId: string | null | undefined, title: string, id?: string) {
  const entry: RecentProjectEntry = {
    id:
      id ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`),
    title,
    updatedAt: Date.now(),
  };
  const existing = loadRecentProjects(ownerId).filter((project) => project.id !== entry.id);
  existing.unshift(entry);
  saveRecentProjects(ownerId, existing.slice(0, 50));
}
