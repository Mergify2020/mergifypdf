"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { createPortal } from "react-dom";
import {
  PROJECT_NAME_STORAGE_KEY,
  deriveProjectNameFromFilename,
} from "@/lib/projectName";
import { useWorkspaceFilePreloader, type PendingWorkspaceFile } from "@/components/useWorkspaceFilePreloader";
import PendingFilesReorderList from "@/components/PendingFilesReorderList";
import { uploadProjectPreviewFromFile } from "@/lib/projectPreview";
import {
  beginWorkspaceOpenHandoff,
  WORKSPACE_OPEN_IN_PROGRESS_STORAGE_KEY,
} from "@/lib/workspaceOpenHandoff";

const WORKSPACE_META_KEY = "mpdf:files";
const WORKSPACE_HIGHLIGHTS_KEY = "mpdf:highlights";
const STARTUP_OVERLAY_KEY = "mpdf:startup-overlay";
const STARTUP_OVERLAY_CONTEXT_KEY = "mpdf:startup-overlay-context";
const EXISTING_PROJECT_OVERLAY_STORAGE_KEY = "mpdf:existing-project-overlay";
const MAX_PENDING_FILES = 12;
const WORKSPACE_LAUNCH_MIN_MS = 4000;
const WORKSPACE_LAUNCH_HOLD_FOR_TESTING = false;
const WORKSPACE_LAUNCH_MODAL_EXIT_MS = 180;
const WORKSPACE_LAUNCH_FILE_FLASH_MS = 130;
const WORKSPACE_LAUNCH_PANEL_COMPLETE_MS = 980;

type Props = {
  className?: string;
  variant?: "default" | "custom";
  iconOnly?: boolean;
  onOpen?: () => void;
};

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
  try {
    window.sessionStorage?.removeItem(STARTUP_OVERLAY_KEY);
    window.sessionStorage?.removeItem(STARTUP_OVERLAY_CONTEXT_KEY);
    window.sessionStorage?.removeItem(EXISTING_PROJECT_OVERLAY_STORAGE_KEY);
    window.sessionStorage?.removeItem(WORKSPACE_OPEN_IN_PROGRESS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function uploadProjectPdfFromFile(file: File | null | undefined, projectId: string) {
  if (!file || !projectId) return false;
  const formData = new FormData();
  formData.append("file", file, file.name);
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/pdf`, {
    method: "POST",
    body: formData,
  });
  return res.ok;
}

export default function StartProjectButton({ className, variant = "default", iconOnly = false, onOpen }: Props) {
  const router = useRouter();
  const { queuePreload } = useWorkspaceFilePreloader();
  const [open, setOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingWorkspaceFile[]>([]);
  const [limitFlashSignal, setLimitFlashSignal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [launchExiting, setLaunchExiting] = useState(false);
  const [launchFileFlash, setLaunchFileFlash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragDepthRef = useRef(0);
  const launchFlashTimerRef = useRef<number | null>(null);

  const resetLaunchTransition = () => {
    if (launchFlashTimerRef.current !== null) {
      window.clearTimeout(launchFlashTimerRef.current);
      launchFlashTimerRef.current = null;
    }
    setLaunchExiting(false);
    setLaunchFileFlash(false);
  };

  useEffect(() => {
    if (!open) return;
    document.body.dataset.modalOpen = "true";

    const scrollY = window.scrollY || 0;
    const body = document.body;
    const html = document.documentElement;
    const prevBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    const prevHtmlOverflow = html.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      delete document.body.dataset.modalOpen;
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBody.overflow;
      body.style.position = prevBody.position;
      body.style.top = prevBody.top;
      body.style.left = prevBody.left;
      body.style.right = prevBody.right;
      body.style.width = prevBody.width;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (launchFlashTimerRef.current !== null) window.clearTimeout(launchFlashTimerRef.current);
    };
  }, []);

  const missingFiles = pendingFiles.length === 0;
  const showFilesError = showValidation && missingFiles;

  const createId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `file_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const filtered = list.filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );

    if (filtered.length === 0) {
      setError("Please upload at least one PDF document.");
      return;
    }

    setPendingFiles((prev) => {
      const remainingSlots = Math.max(0, MAX_PENDING_FILES - prev.length);
      if (remainingSlots === 0) {
        setLimitFlashSignal((value) => value + 1);
        return prev;
      }
      const filesToAdd = filtered.slice(0, remainingSlots);
      const next = [...prev, ...filesToAdd.map((file) => ({ id: createId(), file }))];
      if (filesToAdd.length < filtered.length) {
        setLimitFlashSignal((value) => value + 1);
        if (error) setError(null);
      } else if (error) {
        setError(null);
      }
      return next;
    });
  }

  function launchModal() {
    onOpen?.();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("workspace-clear-project-selection"));
    }
    setError(null);
    setLimitFlashSignal(0);
    setPendingFiles([]);
    resetLaunchTransition();
    setShowValidation(false);
    setOpen(true);
  }

  function closeModal() {
    if (busy) return;
    resetLaunchTransition();
    setOpen(false);
  }

  async function handleStart() {
    const startedAt = Date.now();
    setShowValidation(true);
    if (missingFiles) {
      setError(null);
      return;
    }
    const clean = deriveProjectNameFromFilename(pendingFiles[0]?.file?.name);
    try {
      window.localStorage?.setItem(PROJECT_NAME_STORAGE_KEY, clean);
    } catch {
      // ignore storage failures
    }
    setLaunchExiting(true);
    setLaunchFileFlash(true);
    if (launchFlashTimerRef.current !== null) window.clearTimeout(launchFlashTimerRef.current);
    launchFlashTimerRef.current = window.setTimeout(() => {
      setLaunchFileFlash(false);
      launchFlashTimerRef.current = null;
    }, WORKSPACE_LAUNCH_FILE_FLASH_MS);
    setBusy(true);
    beginWorkspaceOpenHandoff(pendingFiles, startedAt);
    await resetWorkspaceStorage();
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean, data: { pages: [], sources: [], pagesCount: 0 } }),
      });
      if (!res.ok) {
        setError("Could not create that project. Please try again.");
        setBusy(false);
        resetLaunchTransition();
        return;
      }
      const json = (await res.json().catch(() => null)) as { project?: { id?: string } } | null;
      const id = json?.project?.id;
      if (!id) {
        setError("Could not create that project. Please try again.");
        setBusy(false);
        resetLaunchTransition();
        return;
      }
      void uploadProjectPreviewFromFile(pendingFiles[0]?.file, id);
      if (pendingFiles.length === 1) {
        try {
          await uploadProjectPdfFromFile(pendingFiles[0]?.file, id);
        } catch {
          // fall back to studio-side sync if immediate cloud upload fails
        }
      }
      queuePreload(pendingFiles, id);
      const elapsed = Date.now() - startedAt;
      if (elapsed < WORKSPACE_LAUNCH_MIN_MS) {
        await new Promise((resolve) => setTimeout(resolve, WORKSPACE_LAUNCH_MIN_MS - elapsed));
      }
      await new Promise((resolve) => setTimeout(resolve, WORKSPACE_LAUNCH_PANEL_COMPLETE_MS));
      if (WORKSPACE_LAUNCH_HOLD_FOR_TESTING) {
        return;
      }
      router.push(`/studio?project=${encodeURIComponent(id)}`);
    } catch {
      setError("Could not create that project. Please try again.");
      setBusy(false);
      resetLaunchTransition();
      window.dispatchEvent(new Event("workspace-launch-overlay-hide"));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={launchModal}
        className={`${variant === "custom" ? "" : "btn-primary px-8 text-base"} ${className ?? ""}`}
      >
        <FileUp className={`${iconOnly ? "h-7 w-7" : "mr-2 h-7 w-7"}`} aria-hidden />
        <span
          className={`overflow-hidden whitespace-nowrap text-sm transition-[max-width,opacity,transform] duration-200 ease-out ${
            iconOnly
              ? "max-w-0 opacity-0 translate-x-1"
              : "max-w-[160px] opacity-100 translate-x-0"
          }`}
          aria-hidden={iconOnly}
        >
          Start a new project
        </span>
        {iconOnly ? <span className="sr-only">Start a new project</span> : null}
      </button>

      {open
        ? createPortal(
        <>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-[${WORKSPACE_LAUNCH_MODAL_EXIT_MS}ms] ease-out dark:bg-black/55 dark:backdrop-blur-sm ${
              launchExiting ? "opacity-0" : "opacity-100"
            }`}
          />
          <div className={`page-fade-in relative z-10 w-full max-w-4xl text-slate-900 transition-[opacity,transform] duration-[${WORKSPACE_LAUNCH_MODAL_EXIT_MS}ms] ease-out dark:text-zinc-100 ${
            launchExiting ? "pointer-events-none opacity-0 scale-[0.965]" : "opacity-100 scale-100"
          }`}>
            <form
              className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_22px_60px_rgba(15,23,42,0.22),0_0_0_1px_rgba(148,163,184,0.14)] dark:bg-[#323232] dark:shadow-[0_22px_60px_rgba(0,0,0,0.5)]"
              onSubmit={(event) => {
                event.preventDefault();
                void handleStart();
              }}
            >
              <div className="overflow-y-auto px-6 pt-6 pb-0 sm:px-10 sm:pt-7">
                <h2 className="text-[23px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100 sm:text-[26px]">
                  Start with your files
                </h2>
                <div className="mt-5">
                      <div
                        className={`group flex min-h-[360px] w-full flex-col overflow-hidden rounded-[10px] text-center transition duration-200 sm:min-h-[400px] ${
                          showFilesError
                            ? "border border-rose-300 bg-gradient-to-b from-rose-50/70 via-white/90 to-white text-rose-600 shadow-[0_0_0_1px_rgba(251,113,133,0.15)] dark:bg-[#323232]/60"
                            : dragActive
                              ? "scale-[1.01] border border-sky-400/80 bg-gradient-to-b from-white/80 via-sky-50/70 to-white shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_0_30px_rgba(56,189,248,0.25)] dark:bg-[#323232]"
                              : pendingFiles.length === 0
                                ? "border-2 border-dashed border-[#D1D5DB] bg-[#F5F5F5] dark:border-[#3A3A3A] dark:bg-[#2B2B2B]/80"
                                : "bg-transparent dark:bg-transparent"
                        } ${launchFileFlash ? "scale-[1.01] brightness-[1.02] shadow-[0_0_0_1px_rgba(108,71,255,0.15),0_18px_40px_rgba(108,71,255,0.12)]" : ""}`}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          if (busy) return;
                          dragDepthRef.current += 1;
                          setDragActive(true);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (busy) return;
                          setDragActive(true);
                        }}
                        onDragLeave={(event) => {
                          event.preventDefault();
                          if (busy) return;
                          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
                          if (dragDepthRef.current === 0) setDragActive(false);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          dragDepthRef.current = 0;
                          setDragActive(false);
                          if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files);
                        }}
                      >
                        {pendingFiles.length === 0 ? (
                          <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center px-8 py-10 sm:min-h-[400px]">
                            <div className="relative mb-1 h-16 w-18">
                              <FileUp
                                className={`absolute left-1/2 top-1/2 h-14 w-14 -translate-x-[58%] -translate-y-1/2 ${
                                  showFilesError ? "text-rose-500" : "text-[#6C47FF]"
                                }`}
                                aria-hidden
                              />
                            </div>
                            <p
                              className={`mt-4 text-base font-semibold ${
                                showFilesError ? "text-rose-600" : "text-slate-900 dark:text-zinc-100"
                              }`}
                            >
                              {dragActive ? (
                                "Release to add your files"
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="cursor-pointer text-[1.05em] font-bold text-slate-900 underline decoration-1 underline-offset-2 transition hover:text-slate-900 disabled:cursor-not-allowed dark:text-zinc-100 dark:hover:text-zinc-100"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      fileInputRef.current?.click();
                                    }}
                                    disabled={busy}
                                  >
                                    select files
                                  </button>
                                  <span className="sm:hidden"> to get started</span>
                                  <span className="hidden sm:inline"> or drop your files to get started</span>
                                </>
                              )}
                            </p>
                            {!dragActive ? (
                              <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Add up to 12 PDF files.</p>
                            ) : null}
                          </div>
                        ) : (
                          <PendingFilesReorderList
                            files={pendingFiles}
                            busy={busy}
                            onChange={setPendingFiles}
                            onOpenFilePicker={() => fileInputRef.current?.click()}
                            limitFlashSignal={limitFlashSignal}
                          />
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,application/pdf"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            const files = event.target.files;
                            if (files) addFiles(files);
                            event.target.value = "";
                          }}
                          disabled={busy}
                        />
                      </div>

                      {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}
                </div>
              </div>

              <div className="shrink-0 bg-white dark:bg-[#323232]">
                  <div className="flex min-h-[76px] items-center justify-end gap-3 px-6 py-0 text-sm sm:px-10">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-2 py-2 font-semibold text-slate-500 transition hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      disabled={busy}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`inline-flex items-center justify-center rounded-full bg-[#6C47FF] px-5 py-2 font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:bg-[#5B38E6] hover:shadow-[0_18px_50px_rgba(15,23,42,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:bg-[#6C47FF] disabled:shadow-[0_14px_40px_rgba(15,23,42,0.25)] disabled:opacity-60 disabled:pointer-events-none ${
                        launchExiting ? "scale-[0.97] brightness-95" : ""
                      }`}
                      disabled={busy || missingFiles}
                    >
                      Open Workspace
                    </button>
                  </div>
              </div>
            </form>
          </div>
        </div>
        </>,
        document.body,
          )
        : null}
    </>
  );
}
