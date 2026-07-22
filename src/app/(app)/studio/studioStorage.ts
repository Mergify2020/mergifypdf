const WORKSPACE_SESSION_KEY = "mpdf:files";
const WORKSPACE_PREVIEW_CACHE_KEY = "mpdf:preview-cache";
const WORKSPACE_DB_NAME = "mpdf-file-store";
const WORKSPACE_DB_STORE = "files";

export const PREVIEW_CACHE_VERSION = 2;

export type FileStoreEntry = {
  blob: Blob;
  name?: string;
  size?: number;
  updatedAt: number;
};

export type StoredSourceMeta = {
  id: string;
  name?: string;
  size?: number;
  updatedAt?: number;
};

export type WorkspacePreviewCache = {
  version: number;
  sourceIds: string[];
  pages: Array<{
    id: string;
    srcIdx: number;
    pageIdx: number;
    rotation: number;
    width: number;
    height: number;
    thumb: string;
    thumbWidth?: number;
    thumbHeight?: number;
    preview: string;
  }>;
};

let fileStorePromise: Promise<IDBDatabase> | null = null;

function getFileStore(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB is unavailable"));
  }
  if (!fileStorePromise) {
    fileStorePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(WORKSPACE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(WORKSPACE_DB_STORE)) {
          db.createObjectStore(WORKSPACE_DB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    });
  }
  return fileStorePromise;
}

export async function storeFileBlob(id: string, file: Blob, name: string, size: number) {
  const db = await getFileStore();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORKSPACE_DB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    tx.objectStore(WORKSPACE_DB_STORE).put({ blob: file, name, size, updatedAt: Date.now() }, id);
  });
}

export async function readFileBlob(id: string): Promise<FileStoreEntry | null> {
  const db = await getFileStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORKSPACE_DB_STORE, "readonly");
    const request = tx.objectStore(WORKSPACE_DB_STORE).get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
  });
}

export function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (error) {
    console.error("LocalStorage unavailable", error);
    return null;
  }
}

export function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch (error) {
    console.error("SessionStorage unavailable", error);
    return null;
  }
}

export function workspaceFilesKey(projectId: string | null) {
  return projectId ? `${WORKSPACE_SESSION_KEY}:${projectId}` : WORKSPACE_SESSION_KEY;
}

export function workspacePreviewCacheKey(projectKey: string) {
  return `${WORKSPACE_PREVIEW_CACHE_KEY}:${projectKey}`;
}

function arraysEqual<T>(left: T[], right: T[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function readStoredSourceIds(projectId: string | null) {
  const raw = getLocalStorage()?.getItem(workspaceFilesKey(projectId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSourceMeta[];
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((entry) => (entry && typeof entry === "object" ? entry.id : null))
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return null;
  }
}

export function readWorkspacePreviewCache(projectKey: string, expectedSourceIds: string[] | null) {
  const raw = getSessionStorage()?.getItem(workspacePreviewCacheKey(projectKey));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WorkspacePreviewCache;
    if (
      !parsed ||
      parsed.version !== PREVIEW_CACHE_VERSION ||
      !Array.isArray(parsed.pages) ||
      !Array.isArray(parsed.sourceIds)
    ) {
      return null;
    }
    if (expectedSourceIds?.length && !arraysEqual(parsed.sourceIds, expectedSourceIds)) return null;
    const pages = parsed.pages
      .filter((page) => page && typeof page.id === "string")
      .map((page) => ({
        id: page.id,
        srcIdx: typeof page.srcIdx === "number" ? page.srcIdx : 0,
        pageIdx: typeof page.pageIdx === "number" ? page.pageIdx : 0,
        rotation: typeof page.rotation === "number" ? page.rotation : 0,
        width: typeof page.width === "number" ? page.width : 0,
        height: typeof page.height === "number" ? page.height : 0,
        thumb: typeof page.thumb === "string" ? page.thumb : "",
        thumbWidth: typeof page.thumbWidth === "number" ? page.thumbWidth : 0,
        thumbHeight: typeof page.thumbHeight === "number" ? page.thumbHeight : 0,
        preview: typeof page.preview === "string" ? page.preview : "",
      }));
    return pages.length > 0 ? pages : null;
  } catch {
    return null;
  }
}

export function persistSourceMetadata(
  list: Array<{ storageId: string; name: string; size: number; updatedAt: number }>,
  projectId: string | null,
) {
  const storage = getLocalStorage();
  if (!storage) return;
  const key = workspaceFilesKey(projectId);
  if (list.length === 0) {
    storage.removeItem(key);
    return;
  }
  const payload: StoredSourceMeta[] = list.map(({ storageId, name, size, updatedAt }) => ({
    id: storageId,
    name,
    size,
    updatedAt,
  }));
  try {
    storage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.error("Failed to persist workspace metadata", error);
  }
}
