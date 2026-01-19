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
    <div className="projects-grid mt-10 flex w-full flex-wrap justify-start gap-5 [--projects-card-width:clamp(240px,22vw,300px)] sm:gap-6">
      {projects.map((project, index) => {
        const isSelected = !!selected[project.id];
        return (
          <div
            key={project.id}
            className="w-[var(--projects-card-width)] flex-[0_0_var(--projects-card-width)]"
          >
            <ProjectCard
              project={project}
              isSelected={isSelected}
              hasSelection={hasSelection}
              onToggleSelected={toggleSelected}
              onTrashed={onProjectTrashed}
              onRenamed={onProjectRenamed}
              onCopied={onProjectCopied}
            />
          </div>
        );
      })}
    </div>
  );
}
