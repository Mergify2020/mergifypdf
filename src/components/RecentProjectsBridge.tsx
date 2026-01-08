"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  recentProjectsStorageKey,
  saveRecentProjects,
  subscribeRecentProjects,
  type RecentProjectEntry,
} from "@/lib/recentProjects";

export default function RecentProjectsBridge() {
  const { data: session } = useSession();
  const ownerId = session?.user?.id ?? session?.user?.email ?? null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(recentProjectsStorageKey(ownerId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as RecentProjectEntry[];
      if (!Array.isArray(parsed)) return;
      const cleaned = parsed.filter(
        (entry) => typeof entry?.id === "string" && typeof entry?.title === "string"
      );
      if (cleaned.length > 0) {
        saveRecentProjects(ownerId, cleaned);
      }
    } catch {
      // ignore storage errors
    }
  }, [ownerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    return subscribeRecentProjects((update) => {
      if ((update.ownerKey ?? null) !== (ownerId ?? null)) return;
      try {
        window.localStorage.setItem(recentProjectsStorageKey(ownerId), JSON.stringify(update.projects));
      } catch {
        // ignore storage errors
      }
      if (ownerId) {
        void fetch("/api/recent-projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projects: update.projects }),
        }).catch(() => {
          // ignore network errors
        });
      }
    });
  }, [ownerId]);

  return null;
}
