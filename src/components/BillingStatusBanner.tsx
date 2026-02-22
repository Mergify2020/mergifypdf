"use client";

import { AlertTriangle, X } from "lucide-react";

type BillingStatusBannerProps = {
  onUpdatePaymentMethod: () => void;
  onDismiss: () => void;
};

export default function BillingStatusBanner({
  onUpdatePaymentMethod,
  onDismiss,
}: BillingStatusBannerProps) {
  return (
    <div className="w-full border-b border-rose-300 bg-rose-50 px-4 py-2 text-rose-900 shadow-sm dark:border-rose-700/60 dark:bg-rose-900/25 dark:text-rose-100 md:px-6">
      <div className="mx-auto w-full max-w-[calc(var(--shell-content-width)+var(--shell-sidebar-width)+24px)]">
        <div className="relative flex items-center justify-center">
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 pr-10">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <p className="text-xs font-medium md:text-sm">
              We couldn&apos;t process your latest payment. Update your payment method to keep your
              subscription active.
            </p>
            <button
              type="button"
              onClick={onUpdatePaymentMethod}
              className="inline-flex items-center rounded-md bg-[#6C47FF] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#5B38E6] focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/40 focus:ring-offset-2 focus:ring-offset-rose-50 dark:focus:ring-offset-rose-900/20"
            >
              Update payment method
            </button>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-0 inline-flex h-6 w-6 items-center justify-center rounded-md text-rose-700 transition hover:bg-rose-100 hover:text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-400/60 dark:text-rose-200 dark:hover:bg-rose-800/40 dark:hover:text-rose-100"
            aria-label="Dismiss billing warning"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
