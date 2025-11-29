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
    icon: <Layers className="h-5 w-5 text-[#6A4EE8]" aria-hidden />,
  },
  {
    title: "Edit & Annotate",
    description: "Highlight, draw, comment, and add text anywhere.",
    icon: <Highlighter className="h-5 w-5 text-[#6A4EE8]" aria-hidden />,
  },
  {
    title: "Sign Documents",
    description: "Draw, upload, or type your signature in seconds.",
    icon: <PenLine className="h-5 w-5 text-[#6A4EE8]" aria-hidden />,
  },
  {
    title: "Reorder Pages",
    description: "Drag and drop pages into the perfect order.",
    icon: <ListOrdered className="h-5 w-5 text-[#6A4EE8]" aria-hidden />,
  },
  {
    title: "Add or Remove Pages",
    description: "Insert new pages or delete unwanted ones.",
    icon: <FilePlus className="h-5 w-5 text-[#6A4EE8]" aria-hidden />,
  },
  {
    title: "Extract Pages",
    description: "Select specific pages and export them into a new PDF.",
    icon: <FileOutput className="h-5 w-5 text-[#6A4EE8]" aria-hidden />,
  },
  {
    title: "Rotate Pages",
    description: "Quickly rotate any page to the correct orientation.",
    icon: <RotateCcw className="h-5 w-5 text-[#6A4EE8]" aria-hidden />,
  },
  {
    title: "PDF Splitter",
    description: "Split one PDF into multiple smaller files.",
    icon: <ScissorsSquare className="h-5 w-5 text-[#6A4EE8]" aria-hidden />,
  },
];

export default function HeroFeatureGrid() {
  return (
    <section
      aria-labelledby="hero-feature-grid-heading"
      className="bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 md:gap-8">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white px-7 py-6 pt-9 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-slate-900/90" />

              <div className="relative z-10">
                <div className="relative -mt-4 mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100">
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
