"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROJECT_NAME_STORAGE_KEY, sanitizeProjectName } from "@/lib/projectName";

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
    setBusy(false);
    setOpen(false);
    router.push("/studio");
  }

  return (
    <>
      <button
        type="button"
        onClick={launchModal}
        className={`inline-flex items-center justify-center rounded-full bg-white px-10 py-3 text-base font-semibold text-slate-900 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 ${
          className ?? ""
        }`}
      >
        Start a new project
        <svg className="ml-2 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M7 17 17 7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 7h9v9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-[#0b1424] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
            <h2 className="text-2xl font-semibold">Name your project</h2>
            <p className="mt-1 text-sm text-white/70">
              We&apos;ll prep a fresh workspace with this name front and center.
            </p>
            <input
              type="text"
              autoFocus
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError(null);
              }}
              className="mt-5 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-base text-white outline-none focus:border-white/70"
              placeholder="e.g. Pinnacol Audit Packet"
            />
            {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-3 text-sm">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-white/30 px-4 py-2 text-white/80 transition hover:border-white hover:text-white"
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStart}
                className="rounded-full bg-white px-5 py-2 font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 disabled:opacity-60"
                disabled={busy}
              >
                {busy ? "Preparing…" : "Start project"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
