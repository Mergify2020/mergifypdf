"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, FileUp, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import {
  PROJECT_NAME_STORAGE_KEY,
  deriveProjectNameFromFilename,
} from "@/lib/projectName";
import { useWorkspaceFilePreloader, type PendingWorkspaceFile } from "@/components/useWorkspaceFilePreloader";
import { uploadProjectPreviewFromFile } from "@/lib/projectPreview";

const WORKSPACE_META_KEY = "mpdf:files";
const WORKSPACE_HIGHLIGHTS_KEY = "mpdf:highlights";
const STARTUP_OVERLAY_KEY = "mpdf:startup-overlay";
const STARTUP_OVERLAY_CONTEXT_KEY = "mpdf:startup-overlay-context";

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
}

function getFileTypeLabel(file: File) {
  const extension = file.name.split(".").pop()?.trim();
  if (extension) return extension.toUpperCase();
  const subtype = file.type.split("/").pop()?.trim();
  return subtype ? subtype.toUpperCase() : "FILE";
}

export default function StartProjectButton({ className, variant = "default", iconOnly = false, onOpen }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const { queuePreload } = useWorkspaceFilePreloader();
  const [open, setOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingWorkspaceFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragDepthRef = useRef(0);

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

  const missingFiles = pendingFiles.length === 0;
  const showFilesError = showValidation && missingFiles;

  const createId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `file_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"] as const;
    const base = 1024;
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
    const value = bytes / Math.pow(base, exponent);
    const decimals = exponent === 0 ? 0 : 2;
    return `${value.toFixed(decimals)} ${units[exponent]}`;
  }

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const filtered = list.filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );

    if (filtered.length === 0) {
      setError("Please upload at least one PDF document.");
      return;
    }

    setPendingFiles((prev) => [
      ...prev,
      ...filtered.map((file) => ({ id: createId(), file })),
    ]);
    if (error) setError(null);
  }

  function launchModal() {
    onOpen?.();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("workspace-clear-project-selection"));
    }
    setError(null);
    setPendingFiles([]);
    setShowValidation(false);
    setOpen(true);
  }

  function closeModal() {
    if (busy) return;
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
    setBusy(true);
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
        return;
      }
      const json = (await res.json().catch(() => null)) as { project?: { id?: string } } | null;
      const id = json?.project?.id;
      if (!id) {
        setError("Could not create that project. Please try again.");
        setBusy(false);
        return;
      }
      void uploadProjectPreviewFromFile(pendingFiles[0]?.file, id);
      queuePreload(pendingFiles, id);
      const elapsed = Date.now() - startedAt;
      if (elapsed < 2000) {
        await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed));
      }
      setBusy(false);
      setOpen(false);
      window.sessionStorage?.setItem(STARTUP_OVERLAY_KEY, "1");
      window.sessionStorage?.setItem(STARTUP_OVERLAY_CONTEXT_KEY, "new");
      router.push(`/studio?project=${encodeURIComponent(id)}`);
    } catch {
      setError("Could not create that project. Please try again.");
      setBusy(false);
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/55 dark:backdrop-blur-sm"
          />
          <div className="page-fade-in relative z-10 w-full max-w-4xl text-slate-900 dark:text-zinc-100">
            <form
              className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_22px_60px_rgba(15,23,42,0.22),0_0_0_1px_rgba(148,163,184,0.14)] dark:bg-zinc-900 dark:shadow-[0_22px_60px_rgba(0,0,0,0.5)]"
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
                        ? "border border-rose-300 bg-gradient-to-b from-rose-50/70 via-white/90 to-white text-rose-600 shadow-[0_0_0_1px_rgba(251,113,133,0.15)] dark:bg-zinc-900/60"
                        : dragActive
                          ? "scale-[1.01] border border-sky-400/80 bg-gradient-to-b from-white/80 via-sky-50/70 to-white shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_0_30px_rgba(56,189,248,0.25)] dark:bg-zinc-900/70"
                          : pendingFiles.length === 0
                            ? "border-2 border-dashed border-[#D1D5DB] bg-[#F5F5F5] dark:border-zinc-700 dark:bg-zinc-800/80"
                            : "bg-transparent dark:bg-transparent"
                    } ${busy ? "opacity-70" : ""}`}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      if (busy) return;
                      dragDepthRef.current += 1;
                      setDragActive(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!busy) setDragActive(true);
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
                      if (busy) return;
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
                              </button>{" "}
                              or drop your files to get started
                            </>
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="flex h-[360px] flex-col gap-4 pt-0 pb-0 text-left sm:h-[400px]">
                        <div className="overflow-hidden rounded-[10px] border-2 border-dashed border-[#D1D5DB] bg-[#F5F5F5] px-8 py-3 shadow-none dark:border-zinc-700 dark:bg-zinc-800/80">
                          <p className="text-[15px] font-medium text-slate-700 dark:text-zinc-300">
                            Drag and drop, or{" "}
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
                          </p>
                        </div>
                        <div className="min-h-0 flex-1 overflow-hidden rounded-[10px] border-2 border-solid border-[#D1D5DB] bg-white shadow-none dark:border-zinc-700 dark:bg-zinc-900">
                          <div className="upload-list-scroll h-full overflow-y-auto">
                            {pendingFiles.map(({ id, file }) => (
                              <div
                                key={id}
                                className="group flex items-center justify-between gap-3 border-b border-[#DDD4FC] bg-[#F6F2FF] px-4 py-3 text-sm text-slate-800 last:border-b-0 dark:border-zinc-800 dark:bg-zinc-800/70 dark:text-zinc-200"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <FileText className="h-4 w-4 shrink-0 text-slate-500 dark:text-zinc-400" aria-hidden />
                                  <div className="min-w-0">
                                    <span className="block truncate font-semibold text-slate-900 dark:text-zinc-100">{file.name}</span>
                                    <span className="block text-xs font-semibold text-slate-900 dark:text-zinc-300">
                                      {getFileTypeLabel(file)} - {formatBytes(file.size)}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setPendingFiles((prev) => prev.filter((entry) => entry.id !== id))}
                                  className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                  aria-label={`Remove ${file.name}`}
                                  disabled={busy}
                                >
                                  <Trash2 className="h-5 w-5" aria-hidden />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
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

              <div className="shrink-0 bg-white dark:bg-zinc-900">
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
                    className="inline-flex items-center justify-center rounded-full bg-[#6C47FF] px-5 py-2 font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:bg-[#5B38E6] hover:shadow-[0_18px_50px_rgba(15,23,42,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:bg-[#6C47FF] disabled:shadow-[0_14px_40px_rgba(15,23,42,0.25)] disabled:opacity-60 disabled:pointer-events-none"
                    disabled={busy || missingFiles}
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
                      "Open Workspace"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body,
          )
        : null}
    </>
  );
}
