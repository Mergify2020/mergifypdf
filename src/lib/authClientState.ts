"use client";

import { clearAllProjectsSummaryCache } from "@/lib/projectsSummaryCache";

const LOCAL_STORAGE_KEYS = ["mpdf:starred-projects", "mpdf:stripe-status", "mpdf:stripe-plan-tier"];
const SESSION_STORAGE_EXACT_KEYS = [
  "mpdf:profile-display",
  "mpdf:workspace-launch-overlay",
  "mpdf:existing-project-overlay",
  "mpdf:existing-project-id",
  "mpdf:workspace-open-in-progress",
  "mpdf:workspace-startup-overlay",
  "mpdf:workspace-startup-overlay-context",
  "mpdf:pending-upload",
];
const SESSION_STORAGE_PREFIXES = ["mpdf:files", "mpdf:project-preview:", "mpdf:preview-cache:"];

function removeMatchingStorageKeys(storage: Storage, exactKeys: string[], prefixes: string[]) {
  const keysToRemove: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    if (exactKeys.includes(key) || prefixes.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => storage.removeItem(key));
}

export function resetAuthScopedClientState(previousUserId: string | null, nextUserId: string | null) {
  if (typeof window === "undefined") return;

  clearAllProjectsSummaryCache();

  try {
    LOCAL_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore storage failures
  }

  try {
    removeMatchingStorageKeys(window.sessionStorage, SESSION_STORAGE_EXACT_KEYS, SESSION_STORAGE_PREFIXES);
  } catch {
    // ignore storage failures
  }

  if (previousUserId !== nextUserId) {
    try {
      window.dispatchEvent(new Event("mpdf-auth-state-reset"));
    } catch {
      // ignore event dispatch failures
    }
  }
}
