"use client";

import { useEffect, useRef, useState } from "react";
import type { PendingWorkspaceFile } from "@/components/useWorkspaceFilePreloader";
import {
  PROJECT_ENTRY_ELLIPSIS_INTERVAL_MS,
  PROJECT_ENTRY_PROGRESS_COMPLETE_EASE_MS,
  PROJECT_ENTRY_PROGRESS_COMPLETE_HOLD_MS,
  PROJECT_ENTRY_PROGRESS_FIRST_SEGMENT,
  PROJECT_ENTRY_PROGRESS_INITIAL_STEP_MS,
  PROJECT_ENTRY_PROGRESS_PRE_COMPLETE_MAX,
  PROJECT_ENTRY_MIN_VISIBLE_MS,
  PROJECT_ENTRY_PROGRESS_SECOND_SEGMENT,
  PROJECT_ENTRY_PROGRESS_SECOND_STEP_MS,
  PROJECT_ENTRY_PROGRESS_TAIL_BASE,
  PROJECT_ENTRY_PROGRESS_TAIL_MAX,
} from "@/lib/projectEntryLoading";

type Props = {
  files: PendingWorkspaceFile[];
  complete?: boolean;
  title?: string;
  subtitle?: string;
  startedAtMs?: number | null;
  initialProgress?: number | null;
  onCompleteVisualReady?: () => void;
  variant?: "fullscreen" | "panel";
  presentation?: "progress" | "spinner";
};

const ELLIPSIS_FRAMES = ["", ".", "..", "..."] as const;

function getDefaultTitle(files: PendingWorkspaceFile[]) {
  return files.length === 1 ? "Preparing your document" : "Preparing your documents";
}

export default function WorkspaceLaunchLoadingState({
  files,
  complete = false,
  title,
  subtitle,
  startedAtMs = null,
  initialProgress = null,
  onCompleteVisualReady,
  variant = "fullscreen",
  presentation = "progress",
}: Props) {
  const normalizedInitialProgress =
    typeof initialProgress === "number" && Number.isFinite(initialProgress)
      ? Math.min(Math.max(initialProgress, 0), 0.9)
      : 0;
  const [progress, setProgress] = useState(normalizedInitialProgress);
  const progressRef = useRef(normalizedInitialProgress);
  const completeRef = useRef(complete);
  const completeStartedAtRef = useRef<number | null>(null);
  const completeStartProgressRef = useRef(normalizedInitialProgress);
  const completeVisualReadySentRef = useRef(false);
  const completeHoldTimerRef = useRef<number | null>(null);
  const mountedAtRef = useRef<number | null>(null);
  const [ellipsisFrame, setEllipsisFrame] = useState(0);

  useEffect(() => {
    if (mountedAtRef.current === null) mountedAtRef.current = Date.now();
    completeRef.current = complete;
    if (!complete) {
      completeStartedAtRef.current = null;
      completeStartProgressRef.current = progressRef.current;
    }
  }, [complete]);

  useEffect(() => {
    if (presentation === "spinner") return;

    let frameId = 0;
    const localStart = performance.now();

    const tick = () => {
      const elapsed =
        typeof startedAtMs === "number" && Number.isFinite(startedAtMs)
          ? Math.max(0, Date.now() - startedAtMs)
          : performance.now() - localStart;
      let next = progressRef.current;
      if (!completeRef.current) {
        if (elapsed < PROJECT_ENTRY_PROGRESS_INITIAL_STEP_MS) {
          next = (elapsed / PROJECT_ENTRY_PROGRESS_INITIAL_STEP_MS) * PROJECT_ENTRY_PROGRESS_FIRST_SEGMENT;
        } else if (elapsed < PROJECT_ENTRY_PROGRESS_SECOND_STEP_MS) {
          next =
            PROJECT_ENTRY_PROGRESS_FIRST_SEGMENT +
            ((elapsed - PROJECT_ENTRY_PROGRESS_INITIAL_STEP_MS) /
              (PROJECT_ENTRY_PROGRESS_SECOND_STEP_MS - PROJECT_ENTRY_PROGRESS_INITIAL_STEP_MS)) *
              PROJECT_ENTRY_PROGRESS_SECOND_SEGMENT;
        } else {
          const tail = 1 - Math.exp(-(elapsed - PROJECT_ENTRY_PROGRESS_SECOND_STEP_MS) / 1200);
          next = PROJECT_ENTRY_PROGRESS_TAIL_BASE + tail * PROJECT_ENTRY_PROGRESS_TAIL_MAX;
        }
        next = Math.min(next, PROJECT_ENTRY_PROGRESS_PRE_COMPLETE_MAX);
      } else {
        if (completeStartedAtRef.current === null) {
          completeStartedAtRef.current = performance.now();
          completeStartProgressRef.current = progressRef.current;
        }
        const completeElapsed = performance.now() - completeStartedAtRef.current;
        const eased = Math.min(1, completeElapsed / PROJECT_ENTRY_PROGRESS_COMPLETE_EASE_MS);
        next = completeStartProgressRef.current + (1 - completeStartProgressRef.current) * (1 - Math.pow(1 - eased, 3));
      }
      progressRef.current = next;
      setProgress(progressRef.current);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [files, presentation, startedAtMs]);

  useEffect(() => {
    if (presentation === "spinner") {
      if (!complete) return;
      const visibleSince =
        typeof startedAtMs === "number" && Number.isFinite(startedAtMs)
          ? startedAtMs
          : (mountedAtRef.current ?? Date.now());
      const remainingVisibleMs = Math.max(0, PROJECT_ENTRY_MIN_VISIBLE_MS - (Date.now() - visibleSince));
      const timer = window.setTimeout(() => {
        onCompleteVisualReady?.();
      }, Math.max(PROJECT_ENTRY_PROGRESS_COMPLETE_HOLD_MS, remainingVisibleMs));
      return () => window.clearTimeout(timer);
    }
    if (!complete) {
      completeVisualReadySentRef.current = false;
      if (completeHoldTimerRef.current !== null) {
        window.clearTimeout(completeHoldTimerRef.current);
        completeHoldTimerRef.current = null;
      }
      return;
    }
    if (completeVisualReadySentRef.current || progress < 0.999) return;
    completeVisualReadySentRef.current = true;
    if (completeHoldTimerRef.current !== null) {
      window.clearTimeout(completeHoldTimerRef.current);
    }
    const frameId = window.requestAnimationFrame(() => {
      completeHoldTimerRef.current = window.setTimeout(() => {
        onCompleteVisualReady?.();
        completeHoldTimerRef.current = null;
      }, PROJECT_ENTRY_PROGRESS_COMPLETE_HOLD_MS);
    });
    return () => {
      window.cancelAnimationFrame(frameId);
      if (completeHoldTimerRef.current !== null) {
        window.clearTimeout(completeHoldTimerRef.current);
        completeHoldTimerRef.current = null;
      }
    };
  }, [complete, onCompleteVisualReady, presentation, progress, startedAtMs]);

  useEffect(() => {
    if (presentation === "spinner") return;
    const intervalId = window.setInterval(() => {
      setEllipsisFrame((value) => (value + 1) % ELLIPSIS_FRAMES.length);
    }, PROJECT_ENTRY_ELLIPSIS_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [presentation]);

  const resolvedTitle = title ?? getDefaultTitle(files);
  const resolvedSubtitle = subtitle ?? null;
  const ellipsis = ELLIPSIS_FRAMES[ellipsisFrame] ?? "";
  const isPanel = variant === "panel";

  return (
    <div
      className={
        isPanel
          ? "relative flex h-full w-full items-center justify-center px-8 py-10"
          : "workspace-launch-screen relative min-h-screen overflow-hidden bg-[var(--app-surface)]"
      }
    >
      <div
        className={
          isPanel
            ? "relative flex w-full items-center justify-center"
            : "workspace-launch-screen-content relative flex min-h-screen items-center justify-center px-6 py-10"
        }
      >
        <div
          className={`mx-auto flex w-full max-w-[560px] flex-col items-center text-center ${isPanel ? "" : ""}`}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          {presentation === "spinner" ? (
            <div
              className="mb-7 h-12 w-12 animate-spin rounded-full border-[4px] border-[color:var(--spinner-track)] border-t-[color:var(--spinner-head)] motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : null}
          <h2
            className={`no-theme-transition whitespace-nowrap font-semibold tracking-tight text-[var(--app-foreground)] ${
              isPanel ? "text-[20px] sm:text-[26px]" : "text-[21px] sm:text-[32px]"
            }`}
          >
            {resolvedTitle}
            {presentation === "progress" ? (
              <span className="inline-block min-w-[2ch] text-left">{ellipsis}</span>
            ) : null}
          </h2>
          {resolvedSubtitle ? (
            <p className={`mt-3 max-w-[36ch] text-pretty text-sm font-medium text-slate-500 dark:text-zinc-400 ${isPanel ? "sm:text-base" : "sm:text-[15px]"}`}>
              {resolvedSubtitle}
            </p>
          ) : null}

          {presentation === "progress" ? (
            <div
              className={`workspace-launch-progress relative h-[13px] w-full overflow-hidden rounded-full bg-slate-200/95 dark:bg-[#323232] ${
                isPanel ? "mt-8 max-w-[360px]" : "mt-11 max-w-[320px] sm:max-w-none"
              }`}
            >
              <div
                className="workspace-launch-progress-fill relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#6C47FF] via-[#7A5CFF] to-[#8B6CFF] shadow-[0_0_18px_rgba(108,71,255,0.28)] transition-none"
                style={{ width: progress > 0 ? `${Math.max(12, Math.round(progress * 100))}%` : "0%" }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
