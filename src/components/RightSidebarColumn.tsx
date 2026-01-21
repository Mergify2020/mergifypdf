"use client";

import { useRef, type CSSProperties } from "react";
import Link from "next/link";
import { FileText, PenLine, Send } from "lucide-react";

const shadowClasses = "";


export default function RightSidebarColumn() {
  return (
    <aside
      className="relative z-10 w-full min-h-0 overflow-visible pl-1 pr-0 lg:px-0"
      style={
        {
          "--home-sidebar-scrollbar": "0px",
          "--home-sidebar-gutter": "0px",
        } as CSSProperties
      }
    >
      <div
        className="relative w-full"
        style={{
          marginTop: "var(--home-right-column-offset, 240px)",
        }}
      >
        <div className="flex min-h-0 flex-col gap-[24px] overflow-visible">
          <div className="relative rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[12px_0_36px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[12px_0_36px_rgba(0,0,0,0.45)]">
            <Link
              href="/signature-center"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] hover:text-[#4B5563] dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              SIGN DOCUMENTS
            </Link>
            <div className="no-theme-transition mt-3 flex flex-col text-sm font-medium text-slate-700 dark:text-zinc-200">
              <Link
                href="/signature-center"
                className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer"
              >
                <Send
                  className="h-4 w-4 text-[#4F46E5] transition-transform duration-[120ms] group-hover:translate-x-0.5 dark:text-zinc-200"
                  aria-hidden
                />
                <span className="font-semibold">Request signature</span>
              </Link>
              <Link
                href="/signature-center"
                className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer"
              >
                <PenLine
                  className="h-4 w-4 text-slate-500 transition-transform duration-[120ms] group-hover:translate-x-0.5 dark:text-zinc-400"
                  aria-hidden
                />
                <span>Create signature</span>
              </Link>
              <Link
                href="/signature-center"
                className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer"
              >
                <FileText
                  className="h-4 w-4 text-slate-500 transition-transform duration-[120ms] group-hover:translate-x-0.5 dark:text-zinc-400"
                  aria-hidden
                />
                <span>Manage signatures</span>
              </Link>
            </div>
          </div>
          <div className="relative rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[12px_0_36px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[12px_0_36px_rgba(0,0,0,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">Activity</p>
            <div className="mt-3 flex h-24 flex-col items-start justify-center gap-2 rounded-xl border border-dashed border-[#E6EBF2] bg-[#F7F9FC] px-3 text-xs text-[#6B7280] dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E6EBF2] dark:bg-zinc-700" />
              <span>No recent activity</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
