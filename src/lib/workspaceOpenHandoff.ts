export const WORKSPACE_LAUNCH_OVERLAY_STORAGE_KEY = "mpdf:workspace-launch-overlay";
export const EXISTING_PROJECT_OVERLAY_STORAGE_KEY = "mpdf:existing-project-overlay";
const EXISTING_PROJECT_ID_STORAGE_KEY = "mpdf:existing-project-id";
export const WORKSPACE_OPEN_IN_PROGRESS_STORAGE_KEY = "mpdf:workspace-open-in-progress";
const STARTUP_OVERLAY_KEY = "mpdf:workspace-startup-overlay";
const STARTUP_OVERLAY_CONTEXT_KEY = "mpdf:workspace-startup-overlay-context";
const LEGACY_STARTUP_OVERLAY_KEY = "mpdf:startup-overlay";
const LEGACY_STARTUP_OVERLAY_CONTEXT_KEY = "mpdf:startup-overlay-context";
const PENDING_UPLOAD_STORAGE_KEY = "mpdf:pending-upload";
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

type WorkspaceOpenHandoffOptions = {
  preservePendingUpload?: boolean;
};

export function beginWorkspaceOpenHandoff(
  files: WorkspaceOpenHandoffFile[] = [],
  startedAtMs = Date.now(),
  options: WorkspaceOpenHandoffOptions = {},
) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage?.setItem(WORKSPACE_LAUNCH_OVERLAY_STORAGE_KEY, "1");
    window.sessionStorage?.setItem(WORKSPACE_OPEN_IN_PROGRESS_STORAGE_KEY, "1");
    window.sessionStorage?.removeItem(EXISTING_PROJECT_OVERLAY_STORAGE_KEY);
    window.sessionStorage?.removeItem(EXISTING_PROJECT_ID_STORAGE_KEY);
    window.sessionStorage?.removeItem(STARTUP_OVERLAY_KEY);
    window.sessionStorage?.removeItem(STARTUP_OVERLAY_CONTEXT_KEY);
    window.sessionStorage?.removeItem(LEGACY_STARTUP_OVERLAY_KEY);
    window.sessionStorage?.removeItem(LEGACY_STARTUP_OVERLAY_CONTEXT_KEY);
    if (!options.preservePendingUpload) {
      window.localStorage?.removeItem(PENDING_UPLOAD_STORAGE_KEY);
    }
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
    window.sessionStorage?.removeItem(LEGACY_STARTUP_OVERLAY_KEY);
    window.sessionStorage?.removeItem(LEGACY_STARTUP_OVERLAY_CONTEXT_KEY);
    window.localStorage?.removeItem(PENDING_UPLOAD_STORAGE_KEY);
  } catch {
    // ignore storage write failures
  }
  window.dispatchEvent(
    new CustomEvent("workspace-existing-overlay-show", {
      detail: { startedAtMs, projectId },
    }),
  );
}

export function clearWorkspaceOpenHandoffStorage() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage?.removeItem(WORKSPACE_LAUNCH_OVERLAY_STORAGE_KEY);
    window.sessionStorage?.removeItem(EXISTING_PROJECT_OVERLAY_STORAGE_KEY);
    window.sessionStorage?.removeItem(EXISTING_PROJECT_ID_STORAGE_KEY);
    window.sessionStorage?.removeItem(WORKSPACE_OPEN_IN_PROGRESS_STORAGE_KEY);
    window.sessionStorage?.removeItem(STARTUP_OVERLAY_KEY);
    window.sessionStorage?.removeItem(STARTUP_OVERLAY_CONTEXT_KEY);
    window.sessionStorage?.removeItem(LEGACY_STARTUP_OVERLAY_KEY);
    window.sessionStorage?.removeItem(LEGACY_STARTUP_OVERLAY_CONTEXT_KEY);
  } catch {
    // ignore storage write failures
  }
}

export function cancelWorkspaceOpenHandoff() {
  if (typeof window === "undefined") return;
  clearWorkspaceOpenHandoffStorage();
  window.dispatchEvent(new Event("workspace-launch-overlay-hide"));
}
