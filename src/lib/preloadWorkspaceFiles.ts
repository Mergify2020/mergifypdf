type StoredSourceMeta = { id: string; name?: string; size?: number; updatedAt?: number };

export type PendingWorkspaceFile = {
  id: string;
  file: File;
};

const WORKSPACE_DB_NAME = "mpdf-file-store";
const WORKSPACE_DB_STORE = "files";
const WORKSPACE_META_KEY = "mpdf:files";

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB is unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
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
  return dbPromise;
}

async function storeFileBlob(id: string, file: Blob, name: string, size: number) {
  const db = await getDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORKSPACE_DB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    tx.objectStore(WORKSPACE_DB_STORE).put({ blob: file, name, size, updatedAt: Date.now() }, id);
  });
}

function workspaceFilesKey(projectId: string | null) {
  return projectId ? `${WORKSPACE_META_KEY}:${projectId}` : WORKSPACE_META_KEY;
}

export async function preloadWorkspaceFilesForProject(
  files: PendingWorkspaceFile[],
  projectId: string,
) {
  if (typeof window === "undefined") return;
  if (!files.length) return;

  await Promise.all(
    files.map(({ id, file }) => storeFileBlob(id, file, file.name, file.size)),
  );

  const payload: StoredSourceMeta[] = files.map(({ id, file }) => ({
    id,
    name: file.name,
    size: file.size,
    updatedAt: Date.now(),
  }));

  const key = workspaceFilesKey(projectId);
  try {
    window.sessionStorage?.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to persist workspace metadata to session storage", err);
  }
}

