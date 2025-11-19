"use client";

import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { PROJECT_NAME_STORAGE_KEY, sanitizeProjectName } from "@/lib/projectName";

type StoredSourceMeta = { id: string; name?: string; size?: number; updatedAt?: number };
type ResumeSnapshot = { fileName: string; lastEditedLabel: string };

const WORKSPACE_META_KEY = "mpdf:files";

function formatLastEdited(timestamp: number) {
  if (!Number.isFinite(timestamp)) return "moments ago";
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProjectsWorkspaceShelf() {
  const [snapshot, setSnapshot] = useState<ResumeSnapshot | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage?.getItem(WORKSPACE_META_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredSourceMeta[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      const [primary] = [...parsed].sort((a, b) => (b?.updatedAt ?? 0) - (a?.updatedAt ?? 0));
      if (!primary) return;
      const storedProjectName = sanitizeProjectName(
        window.localStorage?.getItem(PROJECT_NAME_STORAGE_KEY) ?? primary.name
      );
      setSnapshot({
        fileName: storedProjectName,
        lastEditedLabel: formatLastEdited(primary.updatedAt ?? Date.now()),
      });
    } catch (err) {
      console.error("Failed to parse saved workspace metadata", err);
    }
  }, []);

  if (!snapshot) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-slate-500">Workspace</p>
            <h2 className="mt-1 text-2xl font-semibold">You&apos;re all caught up</h2>
            <p className="mt-1 text-sm text-slate-500">
              Start a new canvas and we&apos;ll remember where you left off next time.
            </p>
          </div>
          <Link
            href="/studio"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5"
          >
            Launch workspace
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-500">Resume project</p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{snapshot.fileName}</h2>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
              <Clock className="h-4 w-4" />
              Last edited {snapshot.lastEditedLabel}
            </div>
          </div>
          <Link
            href="/studio"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5"
          >
            Resume / Open
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Auto-saved locally</p>
      </div>
    </div>
  );
}
