const WORKSPACE_LAUNCH_OVERLAY_STORAGE_KEY = "mpdf:workspace-launch-overlay";
const EXISTING_PROJECT_OVERLAY_STORAGE_KEY = "mpdf:existing-project-overlay";
const EXISTING_PROJECT_ID_STORAGE_KEY = "mpdf:existing-project-id";
export const WORKSPACE_OPEN_IN_PROGRESS_STORAGE_KEY = "mpdf:workspace-open-in-progress";
const STARTUP_OVERLAY_KEY = "mpdf:workspace-startup-overlay";
const STARTUP_OVERLAY_CONTEXT_KEY = "mpdf:workspace-startup-overlay-context";
const PENDING_UPLOAD_STORAGE_KEY = "mpdf:pending-upload";
const WORKSPACE_DB_NAME = "mpdf-file-store";
const WORKSPACE_DB_STORE = "files";
const WORKSPACE_META_KEY = "mpdf:files";
const WORKSPACE_PREVIEW_CACHE_KEY = "mpdf:preview-cache";
const PREVIEW_CACHE_VERSION = 1;

type StoredSourceMeta = { id: string; name?: string; size?: number; updatedAt?: number };
type WorkspacePreviewCache = {
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

export type WorkspaceOpenClick = {
  defaultPrevented: boolean;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

export function shouldHandleWorkspaceOpenClick(event: WorkspaceOpenClick) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export type WorkspaceOpenHandoffFile = {
  file?: File | null;
};

function workspaceFilesKey(projectId: string | null) {
  return projectId ? `${WORKSPACE_META_KEY}:${projectId}` : WORKSPACE_META_KEY;
}

function workspacePreviewCacheKey(projectId: string) {
  return `${WORKSPACE_PREVIEW_CACHE_KEY}:${projectId}`;
}

function openWorkspaceDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB is unavailable"));
  }
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(WORKSPACE_DB_NAME, 1);
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

function putWorkspaceBlob(db: IDBDatabase, id: string, blob: Blob, name: string, size: number) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORKSPACE_DB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    tx.objectStore(WORKSPACE_DB_STORE).put({ blob, name, size, updatedAt: Date.now() }, id);
  });
}

async function readStoredBlob(id: string) {
  const db = await openWorkspaceDb();
  return new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(WORKSPACE_DB_STORE, "readonly");
    const request = tx.objectStore(WORKSPACE_DB_STORE).get(id);
    request.onsuccess = () => {
      const value = request.result as { blob?: unknown } | undefined;
      resolve(value?.blob instanceof Blob ? value.blob : null);
    };
    request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
  });
}

async function storeCombinedProjectPdf(projectId: string, projectName: string, pdfUrl: string) {
  if (typeof window === "undefined") return false;
  const projectKey = workspaceFilesKey(projectId);
  try {
    const res = await fetch(pdfUrl, { cache: "force-cache" });
    if (!res.ok) return false;
    const blob = await res.blob();
    const combinedStorageId = `cloud-project-${projectId}`;
    const db = await openWorkspaceDb();
    await putWorkspaceBlob(db, combinedStorageId, blob, projectName || "Document.pdf", blob.size);
    const payload: StoredSourceMeta[] = [
      {
        id: combinedStorageId,
        name: projectName || "Document.pdf",
        size: blob.size,
        updatedAt: Date.now(),
      },
    ];
    try {
      window.localStorage?.setItem(projectKey, JSON.stringify(payload));
      window.sessionStorage?.setItem(projectKey, JSON.stringify(payload));
    } catch {
      // ignore storage write failures
    }
    return true;
  } catch {
    return false;
  }
}

function storePreviewCacheSkeleton(projectId: string, sourceIds: string[], pages: unknown) {
  if (typeof window === "undefined" || sourceIds.length === 0 || !Array.isArray(pages) || pages.length === 0) return;
  const payload: WorkspacePreviewCache = {
    version: PREVIEW_CACHE_VERSION,
    sourceIds,
    pages: pages
      .map((page, pageIdx) => {
        if (!page || typeof page !== "object") return null;
        const srcIdx =
          typeof (page as { srcIdx?: unknown }).srcIdx === "number" ? (page as { srcIdx: number }).srcIdx : 0;
        const sourceId = sourceIds[srcIdx] ?? sourceIds[0];
        if (!sourceId) return null;
        const rotation =
          typeof (page as { rotation?: unknown }).rotation === "number"
            ? (page as { rotation: number }).rotation
            : 0;
        const width =
          typeof (page as { width?: unknown }).width === "number"
            ? (page as { width: number }).width
            : 612;
        const height =
          typeof (page as { height?: unknown }).height === "number"
            ? (page as { height: number }).height
            : 792;
        return {
          id: `${sourceId}::${pageIdx}`,
          srcIdx,
          pageIdx,
          rotation,
          width,
          height,
          thumb: "",
          thumbWidth: 0,
          thumbHeight: 0,
          preview: "",
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
  };
  try {
    window.sessionStorage?.setItem(workspacePreviewCacheKey(projectId), JSON.stringify(payload));
  } catch {
    // ignore storage write failures
  }
}

export function beginWorkspaceOpenHandoff(files: WorkspaceOpenHandoffFile[] = [], startedAtMs = Date.now()) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage?.setItem(WORKSPACE_LAUNCH_OVERLAY_STORAGE_KEY, "1");
    window.sessionStorage?.setItem(WORKSPACE_OPEN_IN_PROGRESS_STORAGE_KEY, "1");
    window.sessionStorage?.removeItem(EXISTING_PROJECT_OVERLAY_STORAGE_KEY);
    window.sessionStorage?.removeItem(EXISTING_PROJECT_ID_STORAGE_KEY);
    window.sessionStorage?.removeItem(STARTUP_OVERLAY_KEY);
    window.sessionStorage?.removeItem(STARTUP_OVERLAY_CONTEXT_KEY);
    window.sessionStorage?.removeItem(PENDING_UPLOAD_STORAGE_KEY);
  } catch {
    // ignore storage write failures
  }
  window.dispatchEvent(
    new CustomEvent("workspace-launch-overlay-show", {
      detail: { files, startedAtMs },
    }),
  );
}

export function beginExistingWorkspaceOpenHandoff(projectId: string | null = null, startedAtMs = Date.now()) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage?.setItem(EXISTING_PROJECT_OVERLAY_STORAGE_KEY, "1");
    window.sessionStorage?.setItem(WORKSPACE_OPEN_IN_PROGRESS_STORAGE_KEY, "1");
    if (projectId) {
      window.sessionStorage?.setItem(EXISTING_PROJECT_ID_STORAGE_KEY, projectId);
    } else {
      window.sessionStorage?.removeItem(EXISTING_PROJECT_ID_STORAGE_KEY);
    }
    window.sessionStorage?.removeItem(WORKSPACE_LAUNCH_OVERLAY_STORAGE_KEY);
    window.sessionStorage?.removeItem(STARTUP_OVERLAY_KEY);
    window.sessionStorage?.removeItem(STARTUP_OVERLAY_CONTEXT_KEY);
    window.sessionStorage?.removeItem(PENDING_UPLOAD_STORAGE_KEY);
  } catch {
    // ignore storage write failures
  }
  window.dispatchEvent(
    new CustomEvent("workspace-existing-overlay-show", {
      detail: { startedAtMs, projectId },
    }),
  );
}

export function readExistingWorkspaceProjectId() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage?.getItem(EXISTING_PROJECT_ID_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export async function preloadExistingWorkspaceProject(projectId: string | null) {
  if (typeof window === "undefined" || !projectId) return false;
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, { cache: "no-store" });
    if (!res.ok) return false;
    const json = (await res.json().catch(() => null)) as {
      project?: {
        name?: string | null;
        pdfUrl?: string | null;
        data?: unknown;
      };
    } | null;
    const project = json?.project;
    const pdfUrl = typeof project?.pdfUrl === "string" ? project.pdfUrl : null;
    if (!pdfUrl) return false;

    const cloudData = project?.data;
    const projectPages =
      cloudData && typeof cloudData === "object" && "pages" in cloudData && Array.isArray((cloudData as { pages?: unknown }).pages)
        ? (cloudData as { pages: unknown[] }).pages
        : null;
    const cloudSources =
      cloudData && typeof cloudData === "object" && "sources" in cloudData
        ? (cloudData as { sources?: unknown }).sources
        : null;
    const cloudSourceIds =
      Array.isArray(cloudSources)
        ? cloudSources
            .map((entry) => {
              if (!entry || typeof entry !== "object") return null;
              return "id" in entry && typeof (entry as { id?: unknown }).id === "string"
                ? (entry as { id: string }).id
                : null;
            })
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        : [];
    const cloudSourceMeta =
      Array.isArray(cloudSources)
        ? cloudSources
            .map((entry): StoredSourceMeta | null => {
              if (!entry || typeof entry !== "object") return null;
              const id =
                "id" in entry && typeof (entry as { id?: unknown }).id === "string"
                  ? (entry as { id: string }).id
                  : null;
              if (!id) return null;
              return {
                id,
                ...(("name" in entry && typeof (entry as { name?: unknown }).name === "string"
                  ? { name: (entry as { name: string }).name }
                  : {}) as Pick<StoredSourceMeta, "name">),
                ...(("size" in entry && typeof (entry as { size?: unknown }).size === "number"
                  ? { size: (entry as { size: number }).size }
                  : {}) as Pick<StoredSourceMeta, "size">),
                ...(("updatedAt" in entry && typeof (entry as { updatedAt?: unknown }).updatedAt === "number"
                  ? { updatedAt: (entry as { updatedAt: number }).updatedAt }
                  : {}) as Pick<StoredSourceMeta, "updatedAt">),
              };
            })
            .filter((item): item is StoredSourceMeta => item !== null)
        : [];

    if (Array.isArray(cloudSources) && cloudSources.length > 0) {
      const missingSource = await Promise.all(
        cloudSources.map(async (entry) => {
          if (!entry || typeof entry !== "object") return true;
          const id = "id" in entry && typeof (entry as { id?: unknown }).id === "string"
            ? (entry as { id: string }).id
            : null;
          if (!id) return true;
          try {
            const blob = await readStoredBlob(id);
            return !blob;
          } catch {
            return true;
          }
        }),
      );
      if (missingSource.some(Boolean)) {
        const stored = await storeCombinedProjectPdf(projectId, project?.name ?? "Document.pdf", pdfUrl);
        if (stored && projectPages) {
          storePreviewCacheSkeleton(projectId, [`cloud-project-${projectId}`], projectPages);
        }
        return stored;
      }
      if (projectPages) {
        try {
          window.localStorage?.setItem(workspaceFilesKey(projectId), JSON.stringify(cloudSourceMeta));
          window.sessionStorage?.setItem(workspaceFilesKey(projectId), JSON.stringify(cloudSourceMeta));
        } catch {
          // ignore storage write failures
        }
        storePreviewCacheSkeleton(projectId, cloudSourceIds, projectPages);
      }
      return false;
    }

    const stored = await storeCombinedProjectPdf(projectId, project?.name ?? "Document.pdf", pdfUrl);
    if (stored && projectPages) {
      storePreviewCacheSkeleton(projectId, [`cloud-project-${projectId}`], projectPages);
    }
    return stored;
  } catch {
    return false;
  }
}
