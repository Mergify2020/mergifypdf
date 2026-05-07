"use client";

import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  label?: string;
  zIndexClassName?: string;
  variant?: "fullscreen" | "container";
  keepMounted?: boolean;
  backdropClassName?: string;
  panelClassName?: string;
  spinnerClassName?: string;
  labelClassName?: string;
};

export default function LoadingOverlay({
  open,
  label = "Loading…",
  zIndexClassName = "z-[60]",
  variant = "fullscreen",
  keepMounted = false,
  backdropClassName,
  panelClassName,
  spinnerClassName,
  labelClassName,
}: Props) {
  if (!open && !keepMounted) return null;
  const isVisible = open;
  const spinnerSizeClass = "h-10 w-10 border-4";
  const labelSizeClass = "mt-4 text-sm font-semibold";

  const resolvedBackdropClassName =
    backdropClassName ??
    (variant === "fullscreen"
      ? "bg-[#F1F4F9] dark:bg-[#222224]"
      : "bg-slate-50/85 dark:bg-[#252525]/80");

  const resolvedPanelClassName =
    panelClassName ??
    (variant === "fullscreen"
      ? "bg-transparent border-0 shadow-none px-0 py-0 text-slate-900 dark:text-[#F5F5F5]"
      : "rounded-2xl border border-slate-200 bg-white px-8 py-6 text-slate-900 shadow-[0_22px_60px_rgba(15,23,42,0.12)] dark:border-[#3F3F3F] dark:bg-[#323232] dark:text-[#F5F5F5] dark:shadow-[0_22px_60px_rgba(0,0,0,0.45)]");

  const resolvedSpinnerClassName =
    spinnerClassName ??
    (variant === "fullscreen"
      ? "border-zinc-400 border-t-zinc-900 dark:border-[#3F3F3F] dark:border-t-[#F5F5F5]"
      : "border-slate-300 border-t-slate-700 dark:border-[#3F3F3F] dark:border-t-[#F5F5F5]");

  const overlay = (
    <div
      className={`${variant === "fullscreen" ? "fixed" : "absolute"} inset-0 ${zIndexClassName} isolate flex items-center justify-center transition-opacity duration-150 ${
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isVisible}
      style={variant === "fullscreen" ? { zIndex: 2147483647 } : undefined}
    >
      <div className={`absolute inset-0 z-0 ${resolvedBackdropClassName}`} />
      <div
        className={`relative z-10 flex flex-col items-center ${resolvedPanelClassName}`}
        role={isVisible ? "status" : undefined}
        aria-live={isVisible ? "polite" : undefined}
      >
        <div
          className={`${spinnerSizeClass} animate-spin rounded-full ${resolvedSpinnerClassName}`}
          aria-hidden
        />
        <p className={`${labelSizeClass} ${labelClassName ?? ""}`}>{label}</p>
      </div>
    </div>
  );

  if (variant === "container") return overlay;
  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
