const WORKSPACE_LAUNCH_OVERLAY_STORAGE_KEY = "mpdf:workspace-launch-overlay";
const EXISTING_PROJECT_OVERLAY_STORAGE_KEY = "mpdf:existing-project-overlay";
const EXISTING_PROJECT_ID_STORAGE_KEY = "mpdf:existing-project-id";
export const WORKSPACE_OPEN_IN_PROGRESS_STORAGE_KEY = "mpdf:workspace-open-in-progress";
const STARTUP_OVERLAY_KEY = "mpdf:workspace-startup-overlay";
const STARTUP_OVERLAY_CONTEXT_KEY = "mpdf:workspace-startup-overlay-context";
const PENDING_UPLOAD_STORAGE_KEY = "mpdf:pending-upload";
const WORKSPACE_META_KEY = "mpdf:files";
const WORKSPACE_PREVIEW_CACHE_KEY = "mpdf:preview-cache";
const PREVIEW_CACHE_VERSION = 1;
const existingProjectPreloadInFlight = new Map<string, Promise<boolean>>();

function debugWorkspaceOpen(event: string, detail: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  console.info(`[workspace-open:${event}]`, detail);
}

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

function readStringField(value: unknown, field: string) {
  if (!value || typeof value !== "object") return "";
  const next = (value as Record<string, unknown>)[field];
  return typeof next === "string" ? next : "";
}

function readNumberField(value: unknown, field: string, fallback = 0) {
  if (!value || typeof value !== "object") return fallback;
  const next = (value as Record<string, unknown>)[field];
  return typeof next === "number" && Number.isFinite(next) ? next : fallback;
}

function storePreviewCacheFromProjectData(
  projectId: string,
  sourceIds: string[],
  pages: unknown,
  coverPreviewUrl: string | null = null,
) {
  if (typeof window === "undefined" || sourceIds.length === 0 || !Array.isArray(pages) || pages.length === 0) return;
  const payload: WorkspacePreviewCache = {
    version: PREVIEW_CACHE_VERSION,
    sourceIds,
    pages: pages
      .map((page, pageIdx) => {
        if (!page || typeof page !== "object") return null;
        const srcIdx = readNumberField(page, "srcIdx", 0);
        const sourceId = sourceIds[srcIdx] ?? sourceIds[0];
        if (!sourceId) return null;
        const pageNumber = readNumberField(page, "pageIdx", pageIdx);
        const preview = readStringField(page, "preview") || (pageIdx === 0 ? coverPreviewUrl ?? "" : "");
        const thumb = readStringField(page, "thumb") || (pageIdx === 0 ? preview : "");
        return {
          id: `${sourceId}::${pageNumber}`,
          srcIdx,
          pageIdx: pageNumber,
          rotation: readNumberField(page, "rotation", 0),
          width: readNumberField(page, "width", 612),
          height: readNumberField(page, "height", 792),
          thumb,
          thumbWidth: readNumberField(page, "thumbWidth", 0),
          thumbHeight: readNumberField(page, "thumbHeight", 0),
          preview,
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

export function preloadExistingWorkspaceProject(projectId: string | null) {
  if (typeof window === "undefined" || !projectId) return Promise.resolve(false);
  const inFlight = existingProjectPreloadInFlight.get(projectId);
  if (inFlight) return inFlight;
  const preload = preloadExistingWorkspaceProjectNow(projectId).finally(() => {
    existingProjectPreloadInFlight.delete(projectId);
  });
  existingProjectPreloadInFlight.set(projectId, preload);
  return preload;
}

async function preloadExistingWorkspaceProjectNow(projectId: string) {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  debugWorkspaceOpen("preload-start", { projectId });
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, { cache: "no-store" });
    debugWorkspaceOpen("project-fetch-end", {
      projectId,
      status: res.status,
      durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
    });
    if (!res.ok) return false;
    const json = (await res.json().catch(() => null)) as {
      project?: {
        name?: string | null;
        pdfUrl?: string | null;
        previewUrl?: string | null;
        data?: unknown;
      };
    } | null;
    const project = json?.project;
    const pdfUrl = typeof project?.pdfUrl === "string" ? project.pdfUrl : null;
    const previewUrl = typeof project?.previewUrl === "string" ? project.previewUrl : null;
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
      if (projectPages) {
        try {
          window.localStorage?.setItem(workspaceFilesKey(projectId), JSON.stringify(cloudSourceMeta));
          window.sessionStorage?.setItem(workspaceFilesKey(projectId), JSON.stringify(cloudSourceMeta));
        } catch {
          // ignore storage write failures
        }
        storePreviewCacheFromProjectData(projectId, cloudSourceIds, projectPages, previewUrl);
      }
      debugWorkspaceOpen("preload-end", {
        projectId,
        source: "cloud-sources",
        durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
      });
      return true;
    }

    const combinedStorageId = `cloud-project-${projectId}`;
    const combinedSourceMeta: StoredSourceMeta[] = [
      {
        id: combinedStorageId,
        name: project?.name ?? "Document.pdf",
        size: 0,
        updatedAt: Date.now(),
      },
    ];
    try {
      window.localStorage?.setItem(workspaceFilesKey(projectId), JSON.stringify(combinedSourceMeta));
      window.sessionStorage?.setItem(workspaceFilesKey(projectId), JSON.stringify(combinedSourceMeta));
    } catch {
      // ignore storage write failures
    }
    if (projectPages) {
      storePreviewCacheFromProjectData(projectId, [`cloud-project-${projectId}`], projectPages, previewUrl);
    }
    debugWorkspaceOpen("preload-end", {
      projectId,
      source: "combined-cloud-pdf",
      durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
    });
    return true;
  } catch (error) {
    debugWorkspaceOpen("preload-error", {
      projectId,
      durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
