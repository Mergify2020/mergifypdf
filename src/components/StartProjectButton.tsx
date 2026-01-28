"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, FileUp, Plus, X } from "lucide-react";
import { createPortal } from "react-dom";
import { PROJECT_NAME_STORAGE_KEY, sanitizeProjectName } from "@/lib/projectName";
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

export default function StartProjectButton({ className, variant = "default", iconOnly = false }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const { queuePreload } = useWorkspaceFilePreloader();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingWorkspaceFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
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

  const missingName = !value.trim();
  const missingFiles = pendingFiles.length === 0;
  const showNameError = showValidation && missingName;
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
    setValue("");
    setError(null);
    setPendingFiles([]);
    setShowValidation(false);
    setRemoveConfirmId(null);
    setOpen(true);
  }

  function closeModal() {
    if (busy) return;
    setOpen(false);
  }

  async function handleStart() {
    const startedAt = Date.now();
    setShowValidation(true);
    if (missingName || missingFiles) {
      setError(null);
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
        <Plus className={`${iconOnly ? "h-7 w-7" : "mr-2 h-7 w-7"}`} aria-hidden />
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
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="page-fade-in relative z-10 w-full max-w-3xl rounded-2xl border border-white/60 bg-white/35 bg-gradient-to-b from-white/90 via-white/70 to-white/40 p-1.5 text-slate-900 shadow-[0_0_0_1px_rgba(255,255,255,0.65),0_22px_60px_rgba(15,23,42,0.22)] backdrop-blur-lg sm:p-2">
            <form
              className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-[18px] bg-white/85 shadow-[0_0_0_1px_rgba(148,163,184,0.14)]"
              onSubmit={(event) => {
                event.preventDefault();
                void handleStart();
              }}
            >
              <div className="overflow-y-auto px-6 pt-8 pb-4 sm:px-10 sm:pt-10">
                <h2 className="text-[23px] font-semibold tracking-tight text-slate-900 sm:text-[26px]">
                  Create a new project
                </h2>
                <div className="mt-6 space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={value}
                      onChange={(event) => {
                        setValue(event.target.value);
                        if (error) setError(null);
                      }}
                      aria-label="Project name (required)"
                      className={`peer w-full rounded-2xl border-[3px] bg-white py-4 pl-[29px] pr-5 text-lg text-slate-900 shadow-sm transition focus:outline-none focus:ring-0 ${
                        showNameError
                          ? "border-rose-400 hover:border-rose-500 focus:border-rose-500"
                          : "border-slate-300 hover:border-[#51bdff] focus:border-[#51bdff]"
                      }`}
                      disabled={busy}
                    />
                    {!value ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-[29px] flex items-center text-base"
                      >
                        <span
                          className={`relative pl-1 ${
                            showNameError ? "text-rose-500" : "text-slate-500"
                          }`}
                        >
                          {showNameError ? (
                            <span className="absolute -left-3 font-bold text-rose-500">*</span>
                          ) : null}
                          <span>Name your project</span>
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">This helps you find and organize projects later.</p>
                  {error ? <p className="text-sm text-rose-500">{error}</p> : null}
                </div>

                <div className="mt-6">
                  <div
                    role="button"
                    tabIndex={busy ? -1 : 0}
                    className={`group relative flex w-full flex-col items-center justify-center rounded-[18px] border border-solid px-6 py-12 text-center transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#51bdff] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                      showFilesError
                        ? "border-rose-300 bg-gradient-to-b from-rose-50/70 via-white/90 to-white text-rose-600 shadow-[0_0_0_1px_rgba(251,113,133,0.15)]"
                        : dragActive
                          ? "scale-[1.01] border-sky-400/80 bg-gradient-to-b from-white/80 via-sky-50/70 to-white shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_0_30px_rgba(56,189,248,0.25)]"
                          : "border-slate-200/80 bg-gradient-to-b from-white/70 via-slate-50/80 to-white/90 shadow-[0_0_0_1px_rgba(148,163,184,0.15),0_18px_40px_rgba(15,23,42,0.06)] hover:border-slate-300/80"
                    } ${busy ? "opacity-70" : "cursor-pointer"}`}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (busy) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
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
                    aria-label="Upload PDF files"
                    aria-disabled={busy}
                  >
                    <FileUp
                      className={`h-12 w-12 ${
                        showFilesError ? "text-rose-500" : "text-slate-700"
                      } drop-shadow-[0_0_14px_rgba(56,189,248,0.25)]`}
                      aria-hidden
                    />
                    <p
                      className={`mt-4 text-base font-semibold ${
                        showFilesError ? "text-rose-600" : "text-slate-900"
                      }`}
                    >
                      {dragActive ? "Release to upload" : "Drag & drop or click to upload"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">PDF files only</p>
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

                  {pendingFiles.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                        You&apos;re uploading ({pendingFiles.length})
                      </p>
                      <div className="mt-2 space-y-2">
                        {pendingFiles.map(({ id, file }) => (
                          <div
                            key={id}
                            className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition hover:border-[#51bdff] hover:bg-sky-50/60"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                              <span className="min-w-0 truncate">{file.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {removeConfirmId === id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setRemoveConfirmId(null)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                    disabled={busy}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPendingFiles((prev) => prev.filter((entry) => entry.id !== id));
                                      setRemoveConfirmId(null);
                                    }}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                    disabled={busy}
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="whitespace-nowrap text-xs text-slate-500">
                                    {formatBytes(file.size)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setRemoveConfirmId(id)}
                                    className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                    aria-label={`Remove ${file.name}`}
                                    disabled={busy}
                                  >
                                    <X className="h-4 w-4" aria-hidden />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0 rounded-b-[18px] bg-slate-50/80">
                <div className="flex justify-end gap-3 px-6 pt-[10px] pb-4 text-sm sm:px-10">
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
                    className="inline-flex items-center justify-center rounded-[12px] border-[3px] border-[#51bdff] bg-[#008ade] px-5 py-2 font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:bg-[#007fcd] hover:shadow-[0_18px_50px_rgba(15,23,42,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#51bdff] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:opacity-60"
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
