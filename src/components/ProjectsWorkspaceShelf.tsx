"use client";

import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PROJECT_NAME_STORAGE_KEY, sanitizeProjectName } from "@/lib/projectName";
import { loadRecentProjects, type RecentProjectEntry } from "@/lib/recentProjects";

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
  const { data: session } = useSession();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ownerId = session?.user?.id ?? session?.user?.email ?? null;

    const hydrateFromWorkspaceStorage = () => {
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
    };

    const hydrateFromRecentProjects = async () => {
      if (!ownerId) return false;
      try {
        const res = await fetch("/api/recent-projects", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { projects?: RecentProjectEntry[] };
          if (Array.isArray(data.projects) && data.projects.length > 0) {
            const [latest] = [...data.projects].sort(
              (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
            );
            if (latest) {
              setSnapshot({
                fileName: latest.title,
                lastEditedLabel: formatLastEdited(latest.updatedAt),
              });
              return true;
            }
          }
        }
      } catch {
        // ignore and fall back
      }

      const local = loadRecentProjects(ownerId);
      if (local.length > 0) {
        const [latestLocal] = [...local].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
        if (latestLocal) {
          setSnapshot({
            fileName: latestLocal.title,
            lastEditedLabel: formatLastEdited(latestLocal.updatedAt),
          });
          return true;
        }
      }
      return false;
    };

    const run = async () => {
      const hydratedFromAccount = await hydrateFromRecentProjects();
      if (!hydratedFromAccount) {
        hydrateFromWorkspaceStorage();
      }
    };

    void run();
  }, [session?.user?.email, session?.user?.id]);

  if (!snapshot) {
    return (
      <div className="rounded-[10px] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#9CA3AF]">Workspace</p>
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
    <div className="rounded-[10px] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#9CA3AF]">
            Continue your last project
          </p>
          <div className="space-y-2">
            <p className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {snapshot.fileName}
            </p>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-500">
              <Clock className="h-4 w-4" />
              Updated {snapshot.lastEditedLabel}
            </div>
            <div className="mt-2 h-1 w-2/5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-2/5 bg-gradient-to-r from-[#1E4FD6] to-[#1740AC]" />
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
