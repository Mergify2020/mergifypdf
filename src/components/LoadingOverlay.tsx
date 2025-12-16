"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  label?: string;
  zIndexClassName?: string;
  variant?: "fullscreen" | "container";
  backdropClassName?: string;
  panelClassName?: string;
};

export default function LoadingOverlay({
  open,
  label = "Loading…",
  zIndexClassName = "z-[60]",
  variant = "fullscreen",
  backdropClassName,
  panelClassName,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open) return null;
  if (variant === "fullscreen" && !mounted) return null;

  const resolvedBackdropClassName =
    backdropClassName ?? (variant === "fullscreen" ? "bg-slate-950/70 backdrop-blur-sm" : "bg-slate-50/85");

  const resolvedPanelClassName =
    panelClassName ??
    (variant === "fullscreen"
      ? "rounded-2xl border border-white/15 bg-white/10 px-8 py-6 text-white shadow-[0_22px_60px_rgba(15,23,42,0.35)]"
      : "rounded-2xl border border-slate-200 bg-white px-8 py-6 text-slate-900 shadow-[0_22px_60px_rgba(15,23,42,0.12)]");

  const overlay = (
    <div
      className={`${variant === "fullscreen" ? "fixed" : "absolute"} inset-0 ${zIndexClassName} isolate flex items-center justify-center`}
    >
      <div className={`absolute inset-0 z-0 ${resolvedBackdropClassName}`} />
      <div
        className={`relative z-10 flex flex-col items-center ${resolvedPanelClassName}`}
        role="status"
        aria-live="polite"
      >
        <div
          className={`h-10 w-10 animate-spin rounded-full border-4 ${
            variant === "fullscreen" ? "border-white/30 border-t-white" : "border-slate-300 border-t-slate-700"
          }`}
          aria-hidden
        />
        <p className="mt-4 text-sm font-semibold">{label}</p>
      </div>
    </div>
  );

  if (variant === "container") return overlay;
  return createPortal(overlay, document.body);
}
