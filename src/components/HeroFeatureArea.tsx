"use client";

import { useState } from "react";

const CHIP_LABELS = ["All tools", "Merge", "Edit", "Sign", "Pages", "Export"] as const;

type ChipLabel = (typeof CHIP_LABELS)[number];

type FeatureBox = {
  title: string;
  description: string;
  icon: string;
};

const FEATURE_BOXES: FeatureBox[] = [
  {
    title: "Merge Documents",
    description: "Combine multiple PDFs into one clean file.",
    icon: "🧩",
  },
  {
    title: "Edit & Annotate",
    description: "Highlight, draw, comment, and edit text in your browser.",
    icon: "✏️",
  },
  {
    title: "Sign Documents",
    description: "Draw, upload, or type your signature in seconds.",
    icon: "✍️",
  },
  {
    title: "Reorder Pages",
    description: "Drag and drop pages into the perfect order.",
    icon: "🔀",
  },
  {
    title: "Add or Remove Pages",
    description: "Insert new pages or delete unwanted ones.",
    icon: "➕",
  },
  {
    title: "Extract Pages",
    description: "Select pages and export them into a new PDF.",
    icon: "📤",
  },
  {
    title: "Rotate Pages",
    description: "Fix sideways scans with one-click rotation.",
    icon: "🔁",
  },
  {
    title: "PDF Splitter",
    description: "Split one PDF into multiple smaller files.",
    icon: "🪓",
  },
];

export default function HeroFeatureArea() {
  const [activeChip, setActiveChip] = useState<ChipLabel>("All tools");

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-0 py-10">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold md:text-2xl">
            All the tools you need to work with PDFs.
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Merge, edit, sign, and organize your documents in one place.
          </p>
        </div>

        {/* Feature “tabs” bar */}
        <div className="mx-auto mb-4 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 overflow-x-auto rounded-full border border-slate-100 bg-white px-3 py-2 shadow-md sm:px-4 sm:py-2.5">
            {CHIP_LABELS.map((label) => {
              const isActive = label === activeChip;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveChip(label)}
                  className="group flex flex-col items-center"
                >
                  <span
                    className={[
                      "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium sm:text-sm cursor-pointer",
                      isActive
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-slate-500 hover:text-slate-900",
                    ].join(" ")}
                  >
                    {label}
                  </span>
                  {isActive && (
                    <div className="mt-1 h-[2px] w-full rounded-full bg-indigo-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Helper text */}
        <p className="mb-6 text-center text-sm text-slate-500">
          Jump into the tools you use most — no installs, no sign-up required for your first file.
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {FEATURE_BOXES.map((feature) => (
            <div
              key={feature.title}
              className="group relative flex flex-col rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md sm:p-5"
            >
              <div className="mb-3 flex items-center justify-start">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 sm:h-12 sm:w-12">
                  <span className="text-xl sm:text-2xl" aria-hidden>
                    {feature.icon}
                  </span>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
                {feature.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

