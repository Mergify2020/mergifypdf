"use client";

import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
type ResumeSnapshot = { fileName: string; lastEditedLabel: string };

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
  const { data: session } = useSession();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ownerId = session?.user?.id ?? null;
    if (!ownerId) {
      setSnapshot(null);
      return;
    }

    let cancelled = false;
    setSnapshot(null);

    const load = async () => {
      try {
        const res = await fetch("/api/projects?summary=1", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setSnapshot(null);
          return;
        }
        const data = (await res.json()) as {
          projects?: { name?: string | null; updatedAt: string | number | Date }[];
        };
        if (!Array.isArray(data.projects) || cancelled) {
          if (!cancelled) setSnapshot(null);
          return;
        }
        if (data.projects.length === 0) {
          setSnapshot(null);
          return;
        }
        const [latest] = [...data.projects].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        if (!latest) {
          setSnapshot(null);
          return;
        }
        const updatedAt = new Date(latest.updatedAt).getTime();
        setSnapshot({
          fileName: latest.name?.trim() || "Untitled project",
          lastEditedLabel: formatLastEdited(updatedAt),
        });
      } catch {
        if (!cancelled) setSnapshot(null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  if (!snapshot) {
    return (
      <div className="rounded-[10px] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              Workspace
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">You&apos;re all caught up</h2>
            <p className="mt-1 text-sm text-slate-500">
              Start a new canvas and we&apos;ll remember where you left off next time.
            </p>
          </div>
          <Link
            href="/studio"
            className="btn-primary px-5 py-2.5"
          >
            Launch workspace
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            Continue your last project
          </p>
          <div className="space-y-2">
            <p className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {snapshot.fileName}
            </p>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-500">
              <Clock className="h-4 w-4 text-[var(--color-primary)]" />
              Updated {snapshot.lastEditedLabel}
            </div>
            <div className="mt-2 h-1 w-2/5 overflow-hidden rounded-full bg-[var(--color-primary-light)]">
              <div
                className="h-full w-2/5 rounded-full"
                style={{ backgroundColor: "var(--color-primary)" }}
              />
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <Link href="/studio" className="btn-primary px-7 py-3">
            Resume / Open
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
