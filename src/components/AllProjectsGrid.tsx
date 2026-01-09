"use client";

import { useCallback, useState } from "react";
import ProjectCard from "./ProjectCard";

type Project = {
  id: string;
  title: string;
  updated: string;
  pdfUrl?: string | null;
  pagesCount?: number;
  rotation?: number | null;
  hasPreview?: boolean;
};

type Props = {
  projects: Project[];
  onProjectRenamed?: (id: string, title: string) => void;
  onProjectCopied?: (
    project: {
      id: string;
      name?: string | null;
      updatedAt?: string | number | Date;
      pdfUrl?: string | null;
      pagesCount?: number | null;
      hasPreview?: boolean;
    },
    sourceId: string,
  ) => void;
};

type GridProps = Props & {
  onProjectTrashed?: (id: string) => void;
};

export default function AllProjectsGrid({
  projects,
  onProjectTrashed,
  onProjectRenamed,
  onProjectCopied,
}: GridProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const hasSelection = Object.values(selected).some(Boolean);

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <div className="projects-grid mt-10 grid w-full grid-cols-[repeat(auto-fill,minmax(max(300px,calc(100%/6)),1fr))] gap-5 sm:gap-6">
      {projects.map((project, index) => {
        const isSelected = !!selected[project.id];
        return (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={isSelected}
            hasSelection={hasSelection}
            onToggleSelected={toggleSelected}
            onTrashed={onProjectTrashed}
            onRenamed={onProjectRenamed}
            onCopied={onProjectCopied}
          />
        );
      })}
    </div>
  );
}
