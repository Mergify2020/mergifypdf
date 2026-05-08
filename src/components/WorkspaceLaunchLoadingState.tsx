"use client";

import { useEffect, useRef, useState } from "react";
import type { PendingWorkspaceFile } from "@/components/useWorkspaceFilePreloader";

type Props = {
  files: PendingWorkspaceFile[];
  complete?: boolean;
  headlineOverride?: string;
  startedAtMs?: number | null;
  initialProgress?: number | null;
  onCompleteVisualReady?: () => void;
  variant?: "fullscreen" | "panel";
};

export default function WorkspaceLaunchLoadingState({
  files,
  complete = false,
  headlineOverride,
  startedAtMs = null,
  initialProgress = null,
  onCompleteVisualReady,
  variant = "fullscreen",
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
  const [ellipsisFrame, setEllipsisFrame] = useState(0);
  const ellipsisFrames = ["", ".", "..", "..."];
  const PRE_COMPLETE_MAX_PROGRESS = 0.82;
  const COMPLETE_HOLD_MS = 250;

  useEffect(() => {
    completeRef.current = complete;
    if (!complete) {
      completeStartedAtRef.current = null;
      completeStartProgressRef.current = progressRef.current;
    }
  }, [complete]);

  useEffect(() => {
    let frameId = 0;
    const localStart = performance.now();

    const tick = () => {
      const elapsed =
        typeof startedAtMs === "number" && Number.isFinite(startedAtMs)
          ? Math.max(0, Date.now() - startedAtMs)
          : performance.now() - localStart;
      let next = progressRef.current;
      if (!completeRef.current) {
        if (elapsed < 700) {
          next = (elapsed / 700) * 0.32;
        } else if (elapsed < 1800) {
          next = 0.32 + ((elapsed - 700) / 1100) * 0.38;
        } else {
          const tail = 1 - Math.exp(-(elapsed - 1800) / 1200);
          next = 0.7 + tail * 0.12;
        }
        next = Math.min(next, PRE_COMPLETE_MAX_PROGRESS);
      } else {
        if (completeStartedAtRef.current === null) {
          completeStartedAtRef.current = performance.now();
          completeStartProgressRef.current = progressRef.current;
        }
        const completeElapsed = performance.now() - completeStartedAtRef.current;
        const eased = Math.min(1, completeElapsed / 900);
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
  }, [files, startedAtMs]);

  useEffect(() => {
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
      }, COMPLETE_HOLD_MS);
    });
    return () => {
      window.cancelAnimationFrame(frameId);
      if (completeHoldTimerRef.current !== null) {
        window.clearTimeout(completeHoldTimerRef.current);
        completeHoldTimerRef.current = null;
      }
    };
  }, [complete, progress, onCompleteVisualReady]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setEllipsisFrame((value) => (value + 1) % ellipsisFrames.length);
    }, 420);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [ellipsisFrames.length]);

  const headline =
    headlineOverride ??
    (files.length === 1
      ? "Preparing your document"
      : "Preparing your documents");
  const ellipsis = ellipsisFrames[ellipsisFrame] ?? "";
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
        <div className={`mx-auto flex w-full max-w-[560px] flex-col items-center text-center ${isPanel ? "" : ""}`}>
          <h2
            className={`no-theme-transition whitespace-nowrap font-semibold tracking-tight text-[var(--app-foreground)] ${
              isPanel ? "text-[20px] sm:text-[26px]" : "text-[21px] sm:text-[32px]"
            }`}
          >
            {headline}
            <span className="inline-block min-w-[2ch] text-left">{ellipsis}</span>
          </h2>

          <div
            className={`workspace-launch-progress relative h-[13px] w-full overflow-hidden rounded-full bg-slate-200/95 dark:bg-[#323232] ${
              isPanel ? "mt-8 max-w-[360px]" : "mt-11 max-w-[320px] sm:max-w-none"
            }`}
          >
            <div
              className="workspace-launch-progress-fill relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#6C47FF] via-[#7A5CFF] to-[#8B6CFF] shadow-[0_0_18px_rgba(108,71,255,0.28)] transition-none"
              style={{ width: progress > 0 ? `${Math.max(12, Math.round(progress * 100))}%` : "0%" }}
            >
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
