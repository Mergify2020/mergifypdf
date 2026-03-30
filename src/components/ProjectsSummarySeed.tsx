"use client";

import { useEffect } from "react";
import {
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
  }, [ownerKey, projects]);

  return null;
}
