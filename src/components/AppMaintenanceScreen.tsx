"use client";

import type { AppSafetyStatus } from "@/lib/appSafety";

export default function AppMaintenanceScreen({ status }: { status: AppSafetyStatus }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
          Service Unavailable
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          The app blocked startup to protect your data.
        </h1>
        <p className="mt-4 text-base text-slate-200">
          A database safety check failed. This prevents the app from silently using the wrong or
          uninitialized database.
        </p>

        <div className="mt-6 rounded-xl border border-amber-300/20 bg-black/20 p-4 text-sm text-slate-100">
          <p>
            <span className="font-semibold text-white">Code:</span>{" "}
            <span className="font-mono">{status.code}</span>
          </p>
          <p className="mt-2">
            <span className="font-semibold text-white">Message:</span> {status.message}
          </p>
        </div>

        <p className="mt-6 text-sm text-slate-300">
          Resolve the database configuration, run migrations if needed, and initialize the runtime
          guard for the correct environment before serving traffic again.
        </p>
      </div>
    </main>
  );
}
