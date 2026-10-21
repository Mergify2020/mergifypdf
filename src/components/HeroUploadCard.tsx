"use client";

import { CheckCircle2, ChevronDown, ChevronUp, FileText, FileUp, GripVertical, Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GUEST_PROJECT_STORAGE_KEY, type GuestProject } from "@/lib/guestProject";
import { PENDING_UPLOAD_STORAGE_KEY } from "@/lib/pendingUpload";
import { beginWorkspaceOpenHandoff, cancelWorkspaceOpenHandoff } from "@/lib/workspaceOpenHandoff";
const MAX_HERO_FILES = 12;

export default function HeroUploadCard() {
  const router = useRouter();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<FileReader | null>(null);
  const uploadIdRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [extraCount, setExtraCount] = useState(0);
  const [uiState, setUiState] = useState<"idle" | "ready" | "staging">("idle");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const [dragOverlay, setDragOverlay] = useState<{
    index: number;
    top: number;
    left: number;
    width: number;
    height: number;
    offset: number;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rowPositionsRef = useRef<Array<{ index: number; top: number; height: number }>>([]);
  const dragOverlayRef = useRef<typeof dragOverlay>(null);
  const dragIndexRef = useRef<number | null>(null);
  const insertIndexRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const dragStartYRef = useRef(0);
  const autoScrollRef = useRef<{ direction: -1 | 0 | 1 }>({ direction: 0 });
  const maxScrollRef = useRef(0);
  const listMetricsRef = useRef<{ top: number; left: number; width: number; scrollTop: number }>({
    top: 0,
    left: 0,
    width: 0,
    scrollTop: 0,
  });

  function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes)) return "";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  function openFilePicker() {
    if (busy) return;
    setError(null);
    fileInputRef.current?.click();
  }

  function handleContainerClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    openFilePicker();
  }

  function ensureGuestProject() {
    if (typeof window === "undefined") return;
    try {
      const existingRaw = window.localStorage?.getItem(GUEST_PROJECT_STORAGE_KEY);
      const existing = existingRaw ? (JSON.parse(existingRaw) as GuestProject) : null;
      if (existing && existing.mode === "guest" && typeof existing.id === "string") {
        return;
      }
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const guestProject: GuestProject = {
        id,
        createdAt: Date.now(),
        mode: "guest",
        isPersisted: false,
        ownerId: null,
      };
      window.localStorage?.setItem(GUEST_PROJECT_STORAGE_KEY, JSON.stringify(guestProject));
    } catch {
      // ignore storage failures
    }
  }

  function beginUpload(files: File[]) {
    if (!files.length) return;
    ensureGuestProject();
    const filtered = files.filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
    if (!filtered.length) {
      setError("Please upload a PDF file.");
      return;
    }
    const available = Math.max(0, MAX_HERO_FILES - selectedFiles.length);
    if (available === 0) {
      setError("You can only upload up to 12 files at a time.");
      return;
    }
    const nextFiles = filtered.slice(0, available);
    if (nextFiles.length < filtered.length) {
      setError("You can only upload up to 12 files at a time.");
    } else {
      setError(null);
    }
    const remaining = Math.max(0, nextFiles.length - 1);
    setSelectedFiles((prev) => (prev.length ? [...prev, ...nextFiles] : nextFiles));
    setExtraCount((prev) => (prev ? prev + remaining : remaining));
    setUiState("ready");
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";
    beginUpload(files);
  }

  function handleContainerDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (busy || uiState !== "idle") return;
    const files = Array.from(event.dataTransfer.files ?? []).filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
    beginUpload(files);
  }

  function handleContainerDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function cancelPendingFile(index?: number) {
    uploadIdRef.current = null;
    if (typeof index === "number") {
      const nextLength = Math.max(0, selectedFiles.length - 1);
      setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
      setExtraCount(Math.max(0, nextLength - 1));
      setUiState(nextLength === 0 ? "idle" : "ready");
      setConfirmDeleteIndex(null);
    } else {
      setSelectedFiles([]);
      setExtraCount(0);
      setUiState("idle");
      setConfirmDeleteIndex(null);
    }
    setBusy(false);
    setError(null);
    if (readerRef.current) {
      readerRef.current.abort();
      readerRef.current = null;
    }
  }

  function beginReorder(index: number, event: React.PointerEvent<HTMLDivElement>) {
    if (busy) return;
    const row = rowRefs.current[index];
    if (!row) return;
    const listNode = listRef.current;
    if (!listNode) return;
    const rect = row.getBoundingClientRect();
    const listRect = listNode.getBoundingClientRect();
    listMetricsRef.current = {
      top: listRect.top,
      left: listRect.left,
      width: listRect.width,
      scrollTop: listNode.scrollTop,
    };
    setDragIndex(index);
    const initialSourceIndex = rowRefs.current
      .map((_, idx) => idx)
      .filter((idx) => idx !== index)
      .filter((idx) => idx < index).length;
    setInsertIndex(initialSourceIndex);
    const overlay = {
      index,
      top: rect.top - listRect.top + listNode.scrollTop,
      left: 0,
      width: rect.width,
      height: rect.height,
      offset: event.clientY - rect.top,
    };
    setDragOverlay(overlay);
    dragOverlayRef.current = overlay;
    dragIndexRef.current = index;
    insertIndexRef.current = initialSourceIndex;
    dragMovedRef.current = false;
    dragStartYRef.current = event.clientY;
    event.preventDefault();
  }

  function recomputeRowPositions(skipIndex: number) {
    rowPositionsRef.current = rowRefs.current
      .map((node, rowIndex) => {
        if (!node || rowIndex === skipIndex) return null;
        const box = node.getBoundingClientRect();
        return { index: rowIndex, top: box.top, height: box.height };
      })
      .filter((value): value is { index: number; top: number; height: number } => value !== null)
      .sort((a, b) => a.top - b.top);
  }

  function computeInsertIndex(overlayCenterYViewport: number) {
    const positions = rowPositionsRef.current;
    const sensitivity = 0.4;
    const topEarlyBias = 12;
    const bottomEarlyBias = 12;
    let nextInsert = positions.length;
    for (let i = 0; i < positions.length; i += 1) {
      const threshold =
        positions[i].top +
        positions[i].height * sensitivity +
        (i === 0 ? topEarlyBias : 0) -
        (i === positions.length - 1 ? bottomEarlyBias : 0);
      if (overlayCenterYViewport < threshold) {
        nextInsert = i;
        break;
      }
    }
    insertIndexRef.current = nextInsert;
    setInsertIndex(nextInsert);
  }

  function updateReorderFromPointer(event: PointerEvent) {
    const overlay = dragOverlayRef.current;
    const currentIndex = dragIndexRef.current;
    if (!overlay || currentIndex === null) return;
    if (!dragMovedRef.current) {
      const delta = Math.abs(event.clientY - dragStartYRef.current);
      if (delta < 6) {
        return;
      }
      dragMovedRef.current = true;
    }
    const listNode = listRef.current;
    const listMetrics = listMetricsRef.current;
    let maxScroll = 0;
    if (listNode) {
      const rect = listNode.getBoundingClientRect();
      const edge = 44;
      const rowHeights = rowRefs.current
        .map((node, idx) => (idx === currentIndex ? null : node?.getBoundingClientRect().height ?? null))
        .filter((value): value is number => value !== null);
      const rowCount = rowHeights.length;
      const gap = 8;
      const spacerHeight = overlay.height;
      const totalHeight =
        rowHeights.reduce((sum, h) => sum + h, 0) +
        Math.max(0, rowCount - 1) * gap +
        (insertIndexRef.current !== null ? spacerHeight : 0) +
        (insertIndexRef.current !== null && rowCount > 0 ? gap : 0);
      maxScroll = Math.max(0, totalHeight - listNode.clientHeight);
      maxScrollRef.current = maxScroll;
      if (event.clientY < rect.top + edge) {
        autoScrollRef.current.direction = -1;
      } else if (event.clientY > rect.bottom - edge) {
        autoScrollRef.current.direction = 1;
      } else {
        autoScrollRef.current.direction = 0;
      }
      if (listNode.scrollTop > maxScroll) {
        listNode.scrollTop = maxScroll;
      }
      listMetricsRef.current = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        scrollTop: listNode.scrollTop,
      };
    }
    const rawTop =
      event.clientY - listMetricsRef.current.top + listMetricsRef.current.scrollTop - overlay.offset;
    const paddingBottom = 0;
    const maxTop = Math.max(
      0,
      (listNode ? listNode.clientHeight - paddingBottom : 0) + maxScroll - overlay.height
    );
    const nextTop = Math.min(Math.max(rawTop, 0), maxTop);
    const nextOverlay = { ...overlay, top: nextTop };
    dragOverlayRef.current = nextOverlay;
    setDragOverlay(nextOverlay);

    recomputeRowPositions(currentIndex);
    const overlayCenterY = event.clientY - overlay.offset + overlay.height / 2;
    computeInsertIndex(overlayCenterY);
  }

  function moveFile(index: number, direction: -1 | 1) {
    if (busy) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedFiles.length) return;
    setSelectedFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  }

  function finalizeReorder() {
    const currentIndex = dragIndexRef.current;
    const nextIndex = insertIndexRef.current;
    if (currentIndex !== null && nextIndex !== null) {
      setSelectedFiles((prev) => {
        const dragged = prev[currentIndex];
        const remaining = prev.filter((_, idx) => idx !== currentIndex);
        const clampedIndex = Math.min(Math.max(nextIndex, 0), remaining.length);
        return [
          ...remaining.slice(0, clampedIndex),
          dragged,
          ...remaining.slice(clampedIndex),
        ];
      });
    }
    dragIndexRef.current = null;
    insertIndexRef.current = null;
    dragOverlayRef.current = null;
    dragMovedRef.current = false;
    setDragIndex(null);
    setInsertIndex(null);
    setDragOverlay(null);
  }

  useEffect(() => {
    if (!dragOverlay) return;
    const handleMove = (event: PointerEvent) => updateReorderFromPointer(event);
    const handleUp = () => finalizeReorder();
    let rafId: number | null = null;
    const tick = () => {
      const listNode = listRef.current;
      const dir = autoScrollRef.current.direction;
      if (listNode && dir !== 0) {
        const speed = 6;
        const maxScroll = maxScrollRef.current;
        const prevScroll = listNode.scrollTop;
        listNode.scrollTop = Math.min(
          maxScroll,
          Math.max(0, listNode.scrollTop + dir * speed)
        );
        if (listNode.scrollTop === 0 && dir === -1) {
          autoScrollRef.current.direction = 0;
        }
        if (listNode.scrollTop === maxScroll && dir === 1) {
          autoScrollRef.current.direction = 0;
        }
        const delta = listNode.scrollTop - prevScroll;
        listMetricsRef.current.scrollTop = listNode.scrollTop;
        if (delta !== 0 && dragOverlayRef.current) {
          const updated = { ...dragOverlayRef.current, top: dragOverlayRef.current.top + delta };
          dragOverlayRef.current = updated;
          setDragOverlay(updated);
          recomputeRowPositions(dragIndexRef.current ?? 0);
          const overlayCenterViewport =
            listMetricsRef.current.top -
            listMetricsRef.current.scrollTop +
            updated.top +
            updated.height / 2;
          computeInsertIndex(overlayCenterViewport);
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    window.addEventListener("pointercancel", handleUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [dragOverlay]);

  useEffect(() => {
    if (error !== "You can only upload up to 12 files at a time.") return;
    const timer = window.setTimeout(() => setError(null), 3000);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    const update = () => {
      setIsDesktop(window.matchMedia("(min-width: 1024px)").matches);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  async function handleMergeFiles() {
    if (busy || selectedFiles.length === 0) return;
    setBusy(true);
    setError(null);
    setUiState("staging");
    const startedAt = Date.now();
    beginWorkspaceOpenHandoff(
      selectedFiles.map((file) => ({ file })),
      startedAt,
      { preservePendingUpload: true },
    );
    const uploadId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    uploadIdRef.current = uploadId;
    try {
      const staged: Array<{ name: string; data: string }> = [];
      for (let i = 0; i < selectedFiles.length; i += 1) {
        const file = selectedFiles[i];
        const reader = new FileReader();
        readerRef.current = reader;
        const data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.onerror = () => reject(new Error("read_failed"));
          reader.readAsDataURL(file);
        });
        if (uploadIdRef.current !== uploadId) {
          cancelWorkspaceOpenHandoff();
          return;
        }
        staged.push({ name: file.name, data });
      }
      window.localStorage?.setItem(
        PENDING_UPLOAD_STORAGE_KEY,
        JSON.stringify({ files: staged })
      );
      router.push("/studio");
    } catch (err) {
      console.error("Failed to stage upload", err);
      setError("Unable to prepare those files. Please try again.");
      setUiState("ready");
      cancelWorkspaceOpenHandoff();
    } finally {
      setBusy(false);
      readerRef.current = null;
    }
  }

  const isIdle = uiState === "idle";
  const readyCount = selectedFiles.length;
  const minVisibleRows = readyCount > 0 ? (isDesktop ? 5 : 4) : 0;
  const visibleRows = Math.min(Math.max(readyCount, minVisibleRows), 6);
  const rowHeight = 54;
  const listHeight =
    visibleRows > 0 ? visibleRows * rowHeight + Math.max(0, visibleRows - 1) * 8 : 0;
  const containerClassName = isIdle
    ? `upload-card-animate relative isolate flex h-[320px] lg:h-[402px] flex-col justify-start overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(139,124,255,0.16),transparent_42%),linear-gradient(180deg,rgba(12,15,30,0.98)_0%,rgba(9,12,24,0.96)_100%)] px-8 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(139,124,255,0.14),0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-shadow duration-200 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_0_1px_rgba(139,124,255,0.2),0_22px_46px_rgba(0,0,0,0.36)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(139,124,255,0.2),0_16px_34px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF]/35`
    : "relative isolate flex min-h-[320px] max-w-full flex-col justify-start overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,30,0.96)_0%,rgba(9,12,24,0.94)_100%)] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl";

  return (
    <div
      id="upload"
      className={`scroll-mt-[calc(56px+env(safe-area-inset-top)+18px)] ${containerClassName}`}
      onClick={isIdle ? handleContainerClick : undefined}
      onDrop={handleContainerDrop}
      onDragOver={handleContainerDragOver}
      aria-busy={busy}
    >
      {uiState === "idle" ? (
        <div
          key="hero-upload-idle"
          className="hero-upload-transition flex h-full flex-col items-center justify-center text-center"
        >
          <div className="mb-2 flex justify-center sm:mb-4">
            <FileUp
              className="h-16 w-16 text-[#A79BFF] drop-shadow-[0_10px_26px_rgba(139,124,255,0.35)]"
              aria-hidden="true"
            />
          </div>
          <p className="hidden text-lg font-semibold text-white md:block">Drag & drop to upload</p>
          <div className="mt-3 hidden w-full items-center justify-center gap-3 md:flex">
            <span className="h-[2px] w-20 bg-white/70" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">OR</span>
            <span className="h-[2px] w-20 bg-white/70" aria-hidden="true" />
          </div>
          <div className="mt-4 flex justify-center md:mt-3">
            <button
              type="button"
              onClick={openFilePicker}
              className="press-bounce inline-flex items-center justify-center rounded-xl border border-white/20 bg-gradient-to-r from-[#6D5EF3] to-[#8B7CFF] px-6 py-2.5 text-base font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_10px_18px_rgba(109,94,243,0.24)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:from-[#7567F5] hover:to-[#9486FF] active:translate-y-0.5 active:shadow-[0_10px_20px_rgba(109,94,243,0.22)] md:hidden"
            >
              Select files
            </button>
            <button
              type="button"
              onClick={openFilePicker}
              className="press-bounce hidden items-center justify-center rounded-xl border border-white/20 bg-gradient-to-r from-[#6D5EF3] to-[#8B7CFF] px-6 py-2.5 text-base font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_10px_18px_rgba(109,94,243,0.24)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:from-[#7567F5] hover:to-[#9486FF] active:translate-y-0.5 active:shadow-[0_10px_20px_rgba(109,94,243,0.22)] md:inline-flex"
            >
              Browse files
            </button>
          </div>
          <p className="mt-7 text-[11px] text-white/40 sm:mt-7">
            By uploading a file, you agree to our{" "}
            <a href="/terms" className="text-sky-300 underline underline-offset-2 hover:text-sky-200">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-sky-300 underline underline-offset-2 hover:text-sky-200">
              Privacy Policy
            </a>
            .
          </p>
          <p
            className={`mt-1 min-h-[1rem] text-xs font-semibold text-rose-300 transition-opacity sm:mt-2 ${
              error ? "opacity-100" : "opacity-0"
            }`}
            aria-live="polite"
          >
            {error ?? " "}
          </p>
        </div>
      ) : (
        <div
          key="hero-upload-ready"
          className="hero-upload-transition flex h-full flex-col text-left"
        >
          <div className="flex w-full max-w-full flex-col px-1">
            {error ? (
              <div
                className="mb-2 flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200"
                aria-live="polite"
              >
                <Info className="h-4 w-4" aria-hidden />
                <span>{error}</span>
              </div>
            ) : (
              <div className="pb-2" />
            )}
            <div className="flex items-center justify-between pb-2 pt-1">
              <p className="flex items-center gap-2 text-base font-semibold text-white">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden />
                Ready to upload
              </p>
              <span className="text-base font-semibold text-white">{readyCount}/12</span>
            </div>

            <div className="mt-0 overflow-hidden rounded-xl border border-white/10 bg-[#0f1327] p-1">
              <div
                ref={listRef}
                className="ios-scroll-padding relative w-full max-w-full min-w-0 space-y-2 overflow-hidden"
                style={{
                  height: `${listHeight}px`,
                  overflowY: readyCount > 6 ? "auto" : "hidden",
                  boxSizing: "border-box",
                }}
              >
              {(() => {
                let visibleIndex = 0;
                const baseIndices = selectedFiles.map((_, idx) => idx);
                const visibleIndices = baseIndices.filter((idx) => idx !== dragIndex);
                const visibleIndexMap = new Map<number, number>();
                visibleIndices.forEach((idx, position) => {
                  visibleIndexMap.set(idx, position);
                });
                const sourceIndex =
                  dragIndex !== null
                    ? visibleIndices.filter((idx) => idx < dragIndex).length
                    : 0;
                const effectiveInsertIndex = dragMovedRef.current
                  ? insertIndexRef.current ?? insertIndex ?? sourceIndex
                  : sourceIndex;
                const orderIndices =
                  dragMovedRef.current && dragIndex !== null
                    ? baseIndices.filter((idx) => idx !== dragIndex)
                    : baseIndices;
                const orderMap = new Map<number, number>();
                orderIndices.forEach((idx, position) => {
                  const reserved =
                    dragMovedRef.current && effectiveInsertIndex !== null
                      ? effectiveInsertIndex
                      : null;
                  const displayPosition =
                    reserved !== null && position >= reserved ? position + 2 : position + 1;
                  orderMap.set(idx, displayPosition);
                });
                const rows = selectedFiles.map((file, index) => {
                  const isDraggingRow = dragIndex === index && dragMovedRef.current;
                  if (isDraggingRow) return null;
                  const rowPosition = visibleIndexMap.get(index) ?? 0;
                  const showSpacer =
                    dragMovedRef.current &&
                    dragOverlay !== null &&
                    effectiveInsertIndex === rowPosition;
                  visibleIndex += 1;

                  return (
                    <div key={`${file.name}-${file.size}-${index}`} className="space-y-2">
                      {showSpacer ? (
                        <div
                          className="mx-3 rounded-lg border border-dashed border-[#8B7CFF]/70 bg-[#8B7CFF]/10"
                          style={{ height: dragOverlay?.height ?? 40 }}
                        />
                      ) : null}
                      <div
                        ref={(node) => {
                          rowRefs.current[index] = node;
                        }}
                        className={`group relative grid h-[54px] w-full max-w-full min-w-0 grid-cols-[auto_1fr_auto] items-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 transition-colors hover:border-white/15 hover:bg-white/[0.07] ${
                          busy ? "opacity-70" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 -translate-y-[6px] lg:translate-y-0">
                          <div className="flex items-center gap-2">
                            <span
                              onPointerDown={(event) =>
                                beginReorder(index, event as unknown as React.PointerEvent<HTMLDivElement>)
                              }
                              className={`hidden h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/45 transition-colors group-hover:bg-white/[0.1] group-hover:text-white/70 lg:flex ${
                                busy ? "" : "cursor-grab active:cursor-grabbing active:bg-white/[0.12]"
                              }`}
                            >
                              <GripVertical className="h-4 w-4" aria-hidden />
                            </span>
                            <div className="flex h-full w-6 flex-col items-center justify-center gap-1 lg:hidden pointer-events-auto">
                              <button
                                type="button"
                                onClick={() => moveFile(index, -1)}
                                className="relative z-10 p-0 text-white/45 transition hover:text-[#B6AAFF] disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`Move ${file.name} up`}
                                disabled={uiState === "staging" || index === 0}
                              >
                                <ChevronUp className="h-5 w-5" aria-hidden />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveFile(index, 1)}
                                className="relative z-10 p-0 text-white/45 transition hover:text-[#B6AAFF] disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`Move ${file.name} down`}
                                disabled={uiState === "staging" || index === selectedFiles.length - 1}
                              >
                                <ChevronDown className="h-5 w-5" aria-hidden />
                              </button>
                            </div>
                          </div>
                          <span className="shrink-0 text-[15px] font-semibold text-white/40">
                            {orderMap.get(index) ?? index + 1}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-col justify-center gap-0.5 overflow-hidden -translate-y-[6px] lg:translate-y-0">
                          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
                            <span className="block min-w-0 truncate whitespace-nowrap text-sm font-semibold leading-[1.1] text-white/[0.88]">
                              {file.name}
                            </span>
                          </div>
                          <p className="text-[10px] leading-[1.1] text-white/38">
                            {formatBytes(file.size)}
                          </p>
                        </div>
                        {confirmDeleteIndex === index ? (
                          <div className="flex items-center justify-end gap-2 self-center -translate-y-[6px] lg:translate-y-0">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteIndex(null)}
                              className="flex-1 min-w-0 rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-semibold text-white/72 transition hover:border-white/15 hover:text-white"
                              disabled={uiState === "staging"}
                            >
                              <span className="block min-w-0">Cancel</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelPendingFile(index)}
                              className="flex-1 min-w-0 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-200 transition hover:border-rose-300/40 hover:bg-rose-500/15"
                              disabled={uiState === "staging"}
                            >
                              <span className="block min-w-0">Delete</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteIndex(index)}
                            className="rounded-md border border-transparent p-1 text-white/45 transition hover:border-white/10 hover:bg-white/[0.06] hover:text-white/75 -translate-y-[6px] lg:translate-y-0"
                            aria-label={`Remove ${file.name}`}
                            disabled={uiState === "staging"}
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
                const tailSpacer =
                  dragMovedRef.current &&
                  dragOverlay &&
                  effectiveInsertIndex === visibleIndices.length ? (
                    <div
                      key="drag-tail-spacer"
                      className="mx-3 rounded-lg border border-dashed border-[#8B7CFF]/70 bg-[#8B7CFF]/10"
                      style={{ height: dragOverlay.height }}
                    />
                  ) : null;
                return [...rows, tailSpacer];
              })()}
              {dragOverlay && dragMovedRef.current ? (
                <div
                  className="pointer-events-none absolute z-10"
                  style={{
                    top: dragOverlay.top,
                    left: 0,
                    width: dragOverlay.width,
                  }}
                >
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-[#8B7CFF]/50 bg-[#11162c] px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.25)]">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/70">
                        <GripVertical className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="shrink-0 text-[15px] font-semibold text-white/55">
                        {dragIndex !== null && (insertIndexRef.current ?? insertIndex) !== null
                          ? (insertIndexRef.current ?? insertIndex)! + 1
                          : dragOverlay.index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
                          <span className="min-w-0 truncate text-sm font-semibold text-white/[0.88]">
                            {selectedFiles[dragOverlay.index]?.name}
                          </span>
                        </div>
                        <p className="text-xs text-white/45">
                          {formatBytes(selectedFiles[dragOverlay.index]?.size ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between px-1 pb-0">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={busy}
                  className={`inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-sm font-semibold text-white/72 transition hover:border-white/15 hover:bg-white/[0.1] hover:text-white ${
                    busy ? "pointer-events-none opacity-60" : "cursor-pointer"
                  }`}
                >
                  Add files
                </button>
              </div>
              <button
                type="button"
                onClick={handleMergeFiles}
                disabled={busy}
                className="rounded-full border border-[#8B7CFF]/45 bg-[#8B7CFF] px-4 py-1.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(139,124,255,0.22)] transition hover:bg-[#9A8DFF] disabled:opacity-60"
              >
                {uiState === "staging" ? "Preparing..." : "Continue to workspace"}
              </button>
            </div>
          </div>

          
        </div>
      )}
      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
