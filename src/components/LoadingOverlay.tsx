"use client";

type Props = {
  open: boolean;
  label?: string;
  zIndexClassName?: string;
  variant?: "fullscreen" | "container";
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
  backdropClassName,
  panelClassName,
  spinnerClassName,
  labelClassName,
}: Props) {
  if (!open) return null;
  const spinnerSizeClass = "h-10 w-10 border-4";
  const labelSizeClass = "mt-4 text-sm font-semibold";

  const resolvedBackdropClassName =
    backdropClassName ??
    (variant === "fullscreen"
      ? "bg-white dark:bg-[#222224]"
      : "bg-slate-50/85 dark:bg-slate-950/70");

  const resolvedPanelClassName =
    panelClassName ??
    (variant === "fullscreen"
      ? "bg-transparent border-0 shadow-none px-0 py-0 text-slate-900 dark:text-white"
      : "rounded-2xl border border-slate-200 bg-white px-8 py-6 text-slate-900 shadow-[0_22px_60px_rgba(15,23,42,0.12)] dark:border-zinc-700/80 dark:bg-zinc-900 dark:text-white dark:shadow-[0_22px_60px_rgba(15,23,42,0.35)]");

  const resolvedSpinnerClassName =
    spinnerClassName ??
    (variant === "fullscreen"
      ? "border-zinc-400 border-t-zinc-900 dark:border-zinc-500 dark:border-t-white"
      : "border-slate-300 border-t-slate-700 dark:border-zinc-500 dark:border-t-zinc-100");

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
          className={`${spinnerSizeClass} animate-spin rounded-full ${resolvedSpinnerClassName}`}
          aria-hidden
        />
        <p className={`${labelSizeClass} ${labelClassName ?? ""}`}>{label}</p>
      </div>
    </div>
  );

  if (variant === "container") return overlay;
  return overlay;
}
