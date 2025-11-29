import type { ReactNode } from "react";
import {
  FileOutput,
  FilePlus,
  Highlighter,
  Layers,
  ListOrdered,
  PenLine,
  RotateCcw,
  ScissorsSquare,
} from "lucide-react";

type Feature = {
  title: string;
  description: string;
  icon: ReactNode;
};

const FEATURES: Feature[] = [
  {
    title: "Merge Documents",
    description: "Combine multiple PDFs into one clean file.",
    icon: <Layers className="h-5 w-5 text-slate-900" aria-hidden />,
  },
  {
    title: "Edit & Annotate",
    description: "Highlight, draw, comment, and add text anywhere.",
    icon: <Highlighter className="h-5 w-5 text-slate-900" aria-hidden />,
  },
  {
    title: "Sign Documents",
    description: "Draw, upload, or type your signature in seconds.",
    icon: <PenLine className="h-5 w-5 text-slate-900" aria-hidden />,
  },
  {
    title: "Reorder Pages",
    description: "Drag and drop pages into the perfect order.",
    icon: <ListOrdered className="h-5 w-5 text-slate-900" aria-hidden />,
  },
  {
    title: "Add or Remove Pages",
    description: "Insert new pages or delete unwanted ones.",
    icon: <FilePlus className="h-5 w-5 text-slate-900" aria-hidden />,
  },
  {
    title: "Extract Pages",
    description: "Select specific pages and export them into a new PDF.",
    icon: <FileOutput className="h-5 w-5 text-slate-900" aria-hidden />,
  },
  {
    title: "Rotate Pages",
    description: "Quickly rotate any page to the correct orientation.",
    icon: <RotateCcw className="h-5 w-5 text-slate-900" aria-hidden />,
  },
  {
    title: "PDF Splitter",
    description: "Split one PDF into multiple smaller files.",
    icon: <ScissorsSquare className="h-5 w-5 text-slate-900" aria-hidden />,
  },
];

export default function HeroFeatureGrid() {
  return (
    <section
      aria-labelledby="hero-feature-grid-heading"
      className="mt-12 border-t border-slate-100 bg-slate-50/80"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="mb-10 text-center">
          <h2
            id="hero-feature-grid-heading"
            className="text-xl font-semibold md:text-2xl"
          >
            All the tools you need to work with PDFs.
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Merge, edit, sign, and organize your documents in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 md:gap-8">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 pt-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-[#5C6CFF] via-[#9B51FF] to-[#FF6CAB]" />

              <div className="relative z-10">
                <div className="relative -mt-4 mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md">
                  {feature.icon}
                </div>

                <h3 className="mb-2 text-base font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

