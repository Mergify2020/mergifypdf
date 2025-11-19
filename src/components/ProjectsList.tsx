"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { sanitizeProjectName } from "@/lib/projectName";

type ProjectItem = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  updated: string;
};

type Props = {
  initialProjects: ProjectItem[];
};

export default function ProjectsList({ initialProjects }: Props) {
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openRename(project: ProjectItem) {
    setRenaming({ id: project.id, value: project.title });
    setError(null);
  }

  function closeRename() {
    setRenaming(null);
    setError(null);
  }

  function handleRenameSave() {
    if (!renaming) return;
    const clean = sanitizeProjectName(renaming.value);
    if (!clean) {
      setError("Please enter a name.");
      return;
    }
    setProjects((prev) => prev.map((project) => (project.id === renaming.id ? { ...project, title: clean } : project)));
    closeRename();
  }

  return (
    <>
      <div className="rounded-[36px] border border-white/60 bg-white/95 p-8 shadow-[0_40px_120px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">Your projects</h2>
          <Link
            href="/studio"
            className="inline-flex items-center text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            View all
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 divide-y divide-slate-100">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3">
                <p className="text-lg font-semibold text-slate-900">{project.title}</p>
                <button
                  type="button"
                  onClick={() => openRename(project)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path
                      d="M16.5 3.5a2.121 2.121 0 013 3L7 19.5 3 21l1.5-4L16.5 3.5z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit
                </button>
                <p className="text-sm text-slate-500">Last edited {project.updated}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Download
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 5v10m0 0l-4-4m4 4l4-4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-1 rounded-full bg-[#024d7c] px-3 py-1 text-white transition hover:bg-[#013a60]"
                >
                  Open
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {renaming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeRename} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-[0_35px_70px_rgba(15,23,42,0.35)]">
            <h2 className="text-2xl font-semibold">Reset name to save</h2>
            <p className="mt-1 text-sm text-slate-500">Update the project name below.</p>
            <input
              type="text"
              value={renaming.value}
              onChange={(event) => {
                setRenaming((current) => (current ? { ...current, value: event.target.value } : current));
                if (error) setError(null);
              }}
              className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-400"
            />
            {error ? <p className="mt-2 text-sm text-rose-500">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-3 text-sm">
              <button
                type="button"
                onClick={closeRename}
                className="rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameSave}
                className="rounded-full bg-[#024d7c] px-5 py-2 font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:-translate-y-0.5"
              >
                Save name
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
