"use client";

import { useCallback, useState } from "react";
import ProjectCard from "./ProjectCard";

type Project = {
  id: string;
  title: string;
  updated: string;
  previewUrl?: string | null;
  pageThumbs?: string[];
  pagesCount?: number;
};

type Props = {
  projects: Project[];
};

type GridProps = Props & {
  onProjectTrashed?: (id: string) => void;
};

export default function AllProjectsGrid({ projects, onProjectTrashed }: GridProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const hasSelection = Object.values(selected).some(Boolean);

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <div className="projects-grid mt-10 grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 sm:gap-8 lg:gap-10">
      {projects.map((project, index) => {
        const isSelected = !!selected[project.id];
        return (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={isSelected}
            hasSelection={hasSelection}
            onToggleSelected={toggleSelected}
            imageLoading={index < 12 ? "eager" : "lazy"}
            imagePriority={index < 6}
            onTrashed={onProjectTrashed}
          />
        );
      })}
    </div>
  );
}
