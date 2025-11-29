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
    icon: "✂️",
  },
];

export default function HeroFeatureArea() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-0">
        {/* Feature grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {FEATURE_BOXES.map((feature) => (
            <div
              key={feature.title}
              className="group relative flex flex-col items-center rounded-2xl border border-slate-200 bg-white/80 p-4 text-center shadow-sm backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-5"
            >
              <div className="mb-3 flex items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 sm:h-12 sm:w-12">
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

        <p className="mt-8 text-center text-sm text-slate-500">
          Trusted by freelancers, realtors, students, and small businesses.
        </p>
      </div>
    </section>
  );
}
