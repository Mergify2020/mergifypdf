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
      ? "bg-[var(--app-surface)]"
      : "bg-[var(--app-surface)]/90");

  const resolvedPanelClassName =
    panelClassName ??
    (variant === "fullscreen"
      ? "bg-transparent border-0 shadow-none px-0 py-0 text-slate-900 dark:text-[#F5F5F5]"
      : "rounded-2xl border border-slate-200 bg-[var(--app-surface)] px-8 py-6 text-slate-900 shadow-[0_22px_60px_rgba(15,23,42,0.12)] dark:border-[#3F3F3F] dark:bg-[#323232] dark:text-[#F5F5F5] dark:shadow-[0_22px_60px_rgba(0,0,0,0.45)]");

  const resolvedSpinnerClassName =
    spinnerClassName ??
    (variant === "fullscreen"
      ? "border-4"
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
        className={`no-theme-transition relative z-10 flex flex-col items-center ${resolvedPanelClassName}`}
        role={isVisible ? "status" : undefined}
        aria-live={isVisible ? "polite" : undefined}
      >
        <div
          className={`${spinnerSizeClass} animate-spin rounded-full border-[color:var(--spinner-track)] border-t-[color:var(--spinner-head)] ${resolvedSpinnerClassName} no-theme-transition`}
          aria-hidden
        />
        <p className={`${labelSizeClass} ${labelClassName ?? ""} text-[var(--app-foreground)] no-theme-transition`}>{label}</p>
      </div>
    </div>
  );

  if (variant === "container") return overlay;
  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
