"use client";

import { useEffect } from "react";
import { preloadImageUrls } from "@/lib/preloadImageUrls";
import { setProjectsSummaryCache, type ProjectsSummaryProject } from "@/lib/projectsSummaryCache";

export default function ProjectsSummarySeed({ projects }: { projects: ProjectsSummaryProject[] }) {
  useEffect(() => {
    if (!Array.isArray(projects) || projects.length === 0) return;
    setProjectsSummaryCache(projects);
    preloadImageUrls(
      projects
        .map((project) => project.previewUrl)
        .filter((url): url is string => typeof url === "string" && url.length > 0)
        .slice(0, 12),
    );
  }, [projects]);

  return null;
}

