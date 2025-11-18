"use client";

import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { useEffect, useState } from "react";

type StoredSourceMeta = { id: string; name?: string; size?: number };

type ResumeSnapshot = {
  documentLabel: string;
  docCount: number;
  totalSizeLabel: string;
};

const WORKSPACE_META_KEY = "mpdf:files";

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export default function ProjectsWorkspaceShelf() {
  const [snapshot, setSnapshot] = useState<ResumeSnapshot | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage?.getItem(WORKSPACE_META_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredSourceMeta[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      const totalSize = parsed.reduce((sum, entry) => sum + (entry?.size ?? 0), 0);
      const primaryName = parsed[0]?.name ?? "Imported PDF";
      setSnapshot({
        documentLabel:
          parsed.length === 1 ? primaryName : `${primaryName} +${parsed.length - 1}`,
        docCount: parsed.length,
        totalSizeLabel: formatSize(totalSize),
      });
    } catch (err) {
      console.error("Failed to parse saved workspace metadata", err);
    }
  }, []);

  if (!snapshot) {
    return (
      <div className="rounded-3xl border border-white/15 bg-white/5 p-6 text-white shadow-2xl shadow-black/10 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-white/60">Workspace</p>
            <h2 className="mt-1 text-2xl font-semibold">You&apos;re all caught up</h2>
            <p className="mt-1 text-sm text-white/70">
              Start a new canvas and we&apos;ll remember where you left off next time.
            </p>
          </div>
          <Link
            href="/studio"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5"
          >
            Launch workspace
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-gradient-to-r from-white/10 to-transparent p-6 text-white shadow-2xl shadow-black/10 backdrop-blur">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-white/60">Resume</p>
          <h2 className="mt-1 text-2xl font-semibold">{snapshot.documentLabel}</h2>
          <div className="mt-4 flex flex-wrap gap-6 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 opacity-80" />
              <span>
                {snapshot.docCount} document{snapshot.docCount === 1 ? "" : "s"} •{" "}
                {snapshot.totalSizeLabel}
              </span>
            </div>
            <span className="rounded-full border border-white/25 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
              Last session ready
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="/studio"
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/15 transition hover:-translate-y-0.5"
          >
            Resume editing
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
          <span className="text-xs uppercase tracking-[0.4em] text-white/60">
            Auto-saved locally
          </span>
        </div>
      </div>
    </div>
  );
}

