export type RecentProjectEntry = {
  id: string;
  title: string;
  updatedAt: number;
};

export const RECENT_PROJECTS_STORAGE_KEY = "mpdf:recent-projects";
export const RECENT_PROJECTS_EVENT = "mpdf:recent-projects-updated";

export type RecentProjectsUpdate = {
  ownerKey: string | null;
  projects: RecentProjectEntry[];
};

const cachedByOwner = new Map<string | null, RecentProjectEntry[]>();
const listeners = new Set<(update: RecentProjectsUpdate) => void>();

function storageKey(ownerId: string | null | undefined) {
  return `${RECENT_PROJECTS_STORAGE_KEY}:${ownerId ?? "anon"}`;
}

export function loadRecentProjects(ownerId: string | null | undefined): RecentProjectEntry[] {
  return cachedByOwner.get(ownerId ?? null) ?? [];
}

export function saveRecentProjects(ownerId: string | null | undefined, projects: RecentProjectEntry[]) {
  cachedByOwner.set(ownerId ?? null, projects);
  const payload: RecentProjectsUpdate = { ownerKey: ownerId ?? null, projects };
  listeners.forEach((listener) => listener(payload));
}

export function subscribeRecentProjects(listener: (update: RecentProjectsUpdate) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function recentProjectsStorageKey(ownerId: string | null | undefined) {
  return storageKey(ownerId);
}

export function addRecentProject(ownerId: string | null | undefined, title: string, id?: string) {
  const normalizedTitle = title.trim().toLowerCase();
  const entry: RecentProjectEntry = {
    id:
      id ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`),
    title,
    updatedAt: Date.now(),
  };
  const existing = loadRecentProjects(ownerId).filter((project) => {
    if (project.id === entry.id) return false;
    // If we later learn the real project id, drop any placeholder entries with the same title.
    if (id && project.title.trim().toLowerCase() === normalizedTitle) return false;
    // Also avoid duplicate titles in recents.
    if (project.title.trim().toLowerCase() === normalizedTitle) return false;
    return true;
  });
  existing.unshift(entry);
  saveRecentProjects(ownerId, existing.slice(0, 50));
}

export function updateRecentProjectTitle(ownerId: string | null | undefined, id: string, title: string) {
  if (!id) return;
  const existing = loadRecentProjects(ownerId);
  if (existing.length === 0) return;
  const next = existing.map((entry) => (entry.id === id ? { ...entry, title } : entry));
  saveRecentProjects(ownerId, next);
}

export function removeRecentProject(ownerId: string | null | undefined, id: string) {
  if (!id) return;
  const existing = loadRecentProjects(ownerId);
  if (existing.length === 0) return;
  const next = existing.filter((entry) => entry.id !== id);
  if (next.length === existing.length) return;
  saveRecentProjects(ownerId, next);
}
