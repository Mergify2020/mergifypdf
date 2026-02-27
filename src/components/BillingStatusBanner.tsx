"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BillingStatusBannerProps = {
  onUpdatePaymentMethod: () => void;
  onDismiss: () => void;
  contentMaxWidth?: string;
};

export default function BillingStatusBanner({
  onUpdatePaymentMethod,
  onDismiss,
  contentMaxWidth = "calc(var(--shell-content-width) + var(--shell-sidebar-width) + 24px)",
}: BillingStatusBannerProps) {
  const FULL_MESSAGE = "We couldn't process your latest payment. Please update your payment method.";
  const SHORT_MESSAGE = "We couldn't process your latest payment.";
  const [useShortMessage, setUseShortMessage] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const iconRef = useRef<SVGSVGElement | null>(null);
  const actionRef = useRef<HTMLButtonElement | null>(null);
  const fullMeasureRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const updateMessageMode = () => {
      const row = rowRef.current;
      const icon = iconRef.current;
      const action = actionRef.current;
      const fullMeasure = fullMeasureRef.current;
      if (!row || !icon || !action || !fullMeasure) return;

      const totalWidth = row.getBoundingClientRect().width;
      const iconWidth = icon.getBoundingClientRect().width;
      const actionWidth = action.getBoundingClientRect().width;
      const gaps = 16; // gap-2 between icon/text and text/button
      const availableForMessage = Math.max(0, totalWidth - iconWidth - actionWidth - gaps);
      const fullMessageWidth = fullMeasure.getBoundingClientRect().width;

      setUseShortMessage(fullMessageWidth > availableForMessage);
    };

    updateMessageMode();
    window.addEventListener("resize", updateMessageMode);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateMessageMode) : null;
    if (observer && rowRef.current) observer.observe(rowRef.current);

    return () => {
      window.removeEventListener("resize", updateMessageMode);
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <div className="w-full border-b-2 border-rose-300 bg-rose-50 px-4 py-2 text-rose-900 shadow-sm dark:border-rose-700/60 dark:bg-rose-900/25 dark:text-rose-100 md:px-6">
      <div className="mx-auto w-full" style={{ maxWidth: contentMaxWidth }}>
        <div className="relative flex items-center justify-center">
          <div ref={rowRef} className="flex w-full min-w-0 max-w-[calc(100%-2.5rem)] flex-wrap items-center justify-center gap-2 pr-10 md:flex-nowrap">
            <AlertTriangle ref={iconRef} className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <p className="text-xs font-medium whitespace-nowrap md:text-sm">
              {useShortMessage ? SHORT_MESSAGE : FULL_MESSAGE}
            </p>
            <button
              ref={actionRef}
              type="button"
              onClick={onUpdatePaymentMethod}
              className="inline-flex items-center whitespace-nowrap rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/45 focus:ring-offset-2 focus:ring-offset-rose-50 dark:bg-rose-600 dark:hover:bg-rose-700 dark:focus:ring-offset-rose-900/20"
            >
              Update payment method
            </button>
            <span
              ref={fullMeasureRef}
              className="pointer-events-none absolute -left-[9999px] -top-[9999px] whitespace-nowrap text-xs font-medium md:text-sm"
              aria-hidden
            >
              {FULL_MESSAGE}
            </span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-0 inline-flex h-6 w-6 items-center justify-center rounded-md text-rose-700 transition hover:bg-rose-100 hover:text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-400/60 dark:text-rose-200 dark:hover:bg-rose-800/40 dark:hover:text-rose-100"
            aria-label="Dismiss billing warning"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.7} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
