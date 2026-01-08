"use client";

import { useCallback, useEffect, useState } from "react";

type StoredSourceMeta = { id: string; name?: string; size?: number; updatedAt?: number };

export type PendingWorkspaceFile = {
  id: string;
  file: File;
};

type PreloadRequest = {
  projectId: string;
  files: PendingWorkspaceFile[];
};

const WORKSPACE_DB_NAME = "mpdf-file-store";
const WORKSPACE_DB_STORE = "files";
const WORKSPACE_META_KEY = "mpdf:files";

function workspaceFilesKey(projectId: string | null) {
  return projectId ? `${WORKSPACE_META_KEY}:${projectId}` : WORKSPACE_META_KEY;
}

export function useWorkspaceFilePreloader() {
  const [queue, setQueue] = useState<PreloadRequest[]>([]);

  const queuePreload = useCallback((files: PendingWorkspaceFile[], projectId: string) => {
    if (!files.length) return;
    setQueue((prev) => [...prev, { files, projectId }]);
  }, []);

  useEffect(() => {
    if (queue.length === 0) return;
    let cancelled = false;

    const run = async () => {
      if (typeof window === "undefined") return;
      const [current] = queue;
      if (!current || current.files.length === 0) return;

      const getDb = (): Promise<IDBDatabase> => {
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
      };

      const storeFileBlob = async (db: IDBDatabase, id: string, file: Blob, name: string, size: number) => {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(WORKSPACE_DB_STORE, "readwrite");
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
          tx.objectStore(WORKSPACE_DB_STORE).put({ blob: file, name, size, updatedAt: Date.now() }, id);
        });
      };

      try {
        const db = await getDb();
        await Promise.all(
          current.files.map(({ id, file }) => storeFileBlob(db, id, file, file.name, file.size)),
        );
        const payload: StoredSourceMeta[] = current.files.map(({ id, file }) => ({
          id,
          name: file.name,
          size: file.size,
          updatedAt: Date.now(),
        }));
        const key = workspaceFilesKey(current.projectId);
        try {
          window.sessionStorage?.setItem(key, JSON.stringify(payload));
        } catch (err) {
          console.error("Failed to persist workspace metadata to session storage", err);
        }

        const firstFile = current.files[0]?.file ?? null;
        if (firstFile) {
          const formData = new FormData();
          formData.set("file", firstFile, firstFile.name || "document.pdf");
          void fetch(`/api/projects/${encodeURIComponent(current.projectId)}/pdf`, {
            method: "POST",
            credentials: "include",
            body: formData,
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Failed to preload workspace files", err);
      }

      if (!cancelled) {
        setQueue((prev) => prev.slice(1));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [queue]);

  return { queuePreload };
}
