"use client";

import { useEffect, useState } from "react";
import type { PendingWorkspaceFile } from "@/components/useWorkspaceFilePreloader";

type Props = {
  files: PendingWorkspaceFile[];
  complete?: boolean;
  headlineOverride?: string;
  startedAtMs?: number | null;
  onCompleteVisualReady?: () => void;
  variant?: "fullscreen" | "panel";
};

export default function WorkspaceLaunchLoadingState({
  files,
  complete = false,
  headlineOverride,
  startedAtMs = null,
  onCompleteVisualReady,
  variant = "fullscreen",
}: Props) {
  const [progress, setProgress] = useState(0);
  const [ellipsisFrame, setEllipsisFrame] = useState(0);
  const ellipsisFrames = ["", ".", "..", "..."];

  useEffect(() => {
    if (complete) {
      let frameId = 0;
      const start = performance.now();
      let initialProgress = 0;

      setProgress((current) => {
        initialProgress = current;
        return current;
      });

      const tick = () => {
        const elapsed = performance.now() - start;
        const duration = 720;
        const eased = Math.min(1, elapsed / duration);
        const next = initialProgress + (1 - initialProgress) * (1 - Math.pow(1 - eased, 3));
        setProgress(next);
        if (eased < 1) {
          frameId = window.requestAnimationFrame(tick);
        }
      };

      frameId = window.requestAnimationFrame(tick);
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
    let frameId = 0;
    const localStart = performance.now();

    const tick = () => {
      const elapsed =
        typeof startedAtMs === "number" && Number.isFinite(startedAtMs)
          ? Math.max(0, Date.now() - startedAtMs)
          : performance.now() - localStart;
      let next = 0;
      if (elapsed < 700) {
        next = (elapsed / 700) * 0.32;
      } else if (elapsed < 1800) {
        next = 0.32 + ((elapsed - 700) / 1100) * 0.38;
      } else {
        const tail = 1 - Math.exp(-(elapsed - 1800) / 1200);
        next = 0.7 + tail * 0.2;
      }
      setProgress(Math.min(next, 0.9));
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [complete, files, startedAtMs]);

  useEffect(() => {
    if (!complete) return;
    const timeoutId = window.setTimeout(() => {
      onCompleteVisualReady?.();
    }, 860);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [complete, onCompleteVisualReady]);

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
          : "workspace-launch-screen relative min-h-screen overflow-hidden bg-white dark:bg-[#0F1117]"
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
            className={`whitespace-nowrap font-semibold tracking-tight text-slate-900 dark:text-zinc-100 ${
              isPanel ? "text-[20px] sm:text-[26px]" : "text-[21px] sm:text-[32px]"
            }`}
          >
            {headline}
            <span className="inline-block min-w-[2ch] text-left">{ellipsis}</span>
          </h2>

          <div
            className={`workspace-launch-progress relative h-[13px] w-full overflow-hidden rounded-full bg-slate-200/95 dark:bg-zinc-800 ${
              isPanel ? "mt-8 max-w-[360px]" : "mt-11 max-w-[320px] sm:max-w-none"
            }`}
          >
            <div
              className="workspace-launch-progress-fill relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#6C47FF] via-[#5676FF] to-[#51BDFF] shadow-[0_0_20px_rgba(81,189,255,0.16)] transition-none"
              style={{ width: progress > 0 ? `${Math.max(12, Math.round(progress * 100))}%` : "0%" }}
            >
              <span
                aria-hidden
                className="workspace-launch-progress-motion absolute inset-0 rounded-full"
              />
              <span
                aria-hidden
                className="workspace-launch-progress-edge absolute inset-y-0 right-0 w-10 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
