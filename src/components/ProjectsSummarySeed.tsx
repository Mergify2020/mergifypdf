"use client";

import { useEffect } from "react";
import {
  refreshProjectsSummary,
  setProjectsSummaryCache,
  type ProjectsSummaryProject,
} from "@/lib/projectsSummaryCache";

export default function ProjectsSummarySeed({
  projects,
  ownerKey,
}: {
  projects: ProjectsSummaryProject[];
  ownerKey: string | null | undefined;
}) {
  useEffect(() => {
    if (!Array.isArray(projects)) return;
    setProjectsSummaryCache(ownerKey, projects);
    if (!ownerKey) return;
    void refreshProjectsSummary(ownerKey);
  }, [ownerKey, projects]);

  return null;
}
