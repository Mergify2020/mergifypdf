"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { PROJECT_NAME_STORAGE_KEY, sanitizeProjectName } from "@/lib/projectName";
import { addRecentProject } from "@/lib/recentProjects";

const WORKSPACE_META_KEY = "mpdf:files";
const WORKSPACE_HIGHLIGHTS_KEY = "mpdf:highlights";
const WORKSPACE_DB_NAME = "mpdf-file-store";
const WORKSPACE_DB_STORE = "files";

type Props = {
  className?: string;
};

function clearIndexedDb(): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return Promise.resolve();
  return new Promise((resolve) => {
    const request = indexedDB.open(WORKSPACE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WORKSPACE_DB_STORE)) {
        db.createObjectStore(WORKSPACE_DB_STORE);
      }
    };
    request.onerror = () => resolve();
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WORKSPACE_DB_STORE)) {
        db.close();
        resolve();
        return;
      }
      const tx = db.transaction(WORKSPACE_DB_STORE, "readwrite");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.objectStore(WORKSPACE_DB_STORE).clear();
    };
  });
}

async function resetWorkspaceStorage() {
  try {
    window.localStorage?.removeItem(WORKSPACE_META_KEY);
  } catch {
    // ignore
  }
  try {
    window.sessionStorage?.removeItem(WORKSPACE_META_KEY);
  } catch {
    // ignore
  }
  try {
    window.localStorage?.removeItem(WORKSPACE_HIGHLIGHTS_KEY);
  } catch {
    // ignore
  }
  await clearIndexedDb();
}

export default function StartProjectButton({ className }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function launchModal() {
    setValue("");
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    if (busy) return;
    setOpen(false);
  }

  async function handleStart() {
    if (!value.trim()) {
      setError("Please name your project.");
      return;
    }
    const clean = sanitizeProjectName(value);
    try {
      window.localStorage?.setItem(PROJECT_NAME_STORAGE_KEY, clean);
    } catch {
      // ignore storage failures
    }
    setBusy(true);
    await resetWorkspaceStorage();
    const ownerId = session?.user?.id ?? session?.user?.email ?? null;
    addRecentProject(ownerId, clean);
    setBusy(false);
    setOpen(false);
    router.push("/studio");
  }

  return (
    <>
      <button
        type="button"
        onClick={launchModal}
        className={`btn-primary px-8 text-base ${className ?? ""}`}
      >
        Start a new project
        <svg className="ml-2 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M7 17 17 7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 7h9v9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="page-fade-in relative z-10 w-full max-w-3xl rounded-2xl border border-white/60 bg-white/35 bg-gradient-to-b from-white/90 via-white/70 to-white/40 p-1.5 text-slate-900 shadow-[0_22px_60px_rgba(15,23,42,0.22)] backdrop-blur-lg sm:p-2">
            <form
              className="overflow-hidden rounded-[18px] bg-white/85 px-6 pt-8 pb-6 shadow-[0_0_0_1px_rgba(148,163,184,0.14)] sm:px-10 sm:pt-10 sm:pb-8"
              onSubmit={(event) => {
                event.preventDefault();
                void handleStart();
              }}
            >
              <h2 className="text-[23px] font-semibold tracking-tight text-slate-900 sm:text-[26px]">
                Create a new project
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Give your project a name to get started.
              </p>
              <div className="mt-6 space-y-2">
                <input
                  type="text"
                  autoFocus
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.06)] focus:border-sky-300 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.35)] focus:ring-2 focus:ring-sky-100"
                  placeholder="Name your project"
                />
                {error ? <p className="text-sm text-rose-500">{error}</p> : null}
              </div>
              <div className="mt-6 rounded-t-none rounded-b-[18px] bg-slate-50/80 px-1.5 pt-3">
                <div className="flex justify-end gap-3 text-sm">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-2 py-2 text-slate-500 transition hover:text-slate-900"
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-500 to-sky-600 px-5 py-2 font-semibold text-white transition hover:-translate-y-0.5 hover:from-sky-600 hover:to-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:opacity-60"
                    disabled={busy}
                  >
                    {busy ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white"
                          aria-hidden
                        />
                        <span>Preparing…</span>
                      </span>
                    ) : (
                      "Start project"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
