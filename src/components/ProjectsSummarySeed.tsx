"use client";

import { useEffect } from "react";
import { refreshProjectsSummary, setProjectsSummaryCache, type ProjectsSummaryProject } from "@/lib/projectsSummaryCache";

export default function ProjectsSummarySeed({
  projects,
  ownerKey,
}: {
  projects: ProjectsSummaryProject[];
  ownerKey: string | null | undefined;
}) {
  useEffect(() => {
    if (!Array.isArray(projects) || projects.length === 0) return;
    setProjectsSummaryCache(ownerKey, projects);
    if (!ownerKey) return;
    void refreshProjectsSummary(ownerKey, "no-store");
  }, [ownerKey, projects]);

  return null;
}
