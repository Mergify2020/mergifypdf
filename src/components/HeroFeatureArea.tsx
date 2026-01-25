type FeatureBox = {
  title: string;
  description: string;
  icon: string;
};

const FEATURE_ILLUSTRATIONS: Record<string, string> = {
  "Merge Documents": "/illustrations/merge-documents-illustration.svg",
  "Edit & Annotate": "/illustrations/edit&annotate-illustration.svg",
  "Sign Documents": "/illustrations/sign-documents-illustration.svg",
  "Reorder Pages": "/illustrations/reorder-documents-illustration.svg",
  "Add or Remove Pages": "/illustrations/add-documents-illustration.svg",
  "Extract Pages": "/illustrations/extract-pages-illustration.svg",
  "Split Documents": "/illustrations/split-documents-illustration.svg",
  "Rotate Pages": "/illustrations/rotate-document-illustration.svg",
};

const FEATURE_BOXES: FeatureBox[] = [
  {
    title: "Merge Documents",
    description: "Combine multiple PDFs into one file.",
    icon: "🧩",
  },
  {
    title: "Edit & Annotate",
    description: "Highlight, draw, and add text.",
    icon: "✏️",
  },
  {
    title: "Sign Documents",
    description: "Draw, upload, or type your signature.",
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
    description: "Select pages and export them separately.",
    icon: "📤",
  },
  {
    title: "Rotate Pages",
    description: "Change page rotations as needed.",
    icon: "🔁",
  },
  {
    title: "Split Documents",
    description: "Split one PDF into multiple smaller files.",
    icon: "✂️",
  },
];

export default function HeroFeatureArea() {
  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        {/* Feature grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {FEATURE_BOXES.map((feature) => (
            <div
              key={feature.title}
              className="group relative flex h-full flex-col items-center rounded-2xl border border-slate-200 bg-white/80 p-4 text-center shadow-sm backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-5"
            >
              <div className="mb-5 flex h-28 w-full items-center justify-center sm:h-32">
                {FEATURE_ILLUSTRATIONS[feature.title] ? (
                  <img
                    src={FEATURE_ILLUSTRATIONS[feature.title]}
                    alt=""
                    className="h-full w-auto object-contain"
                    aria-hidden="true"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 sm:h-12 sm:w-12">
                    <span className="text-xl sm:text-2xl" aria-hidden>
                      {feature.icon}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="text-[19px] font-bold text-slate-950 sm:text-xl">
                {feature.title}
              </h3>
              <p className="mt-1 text-xs leading-[1.7] text-slate-600 sm:text-sm mb-0">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <a
            href="/pricing"
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-gradient-to-r from-[#6D5EF3] to-[#8B7CFF] px-7 py-2.5 text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_10px_18px_rgba(109,94,243,0.24)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:from-[#7567F5] hover:to-[#9486FF]"
          >
            Compare plans
          </a>
        </div>

        <div className="mt-6 flex w-full justify-end">
          <p className="text-right text-base font-semibold text-slate-900">
            Do more with your documents — for less.
          </p>
        </div>

      </div>
    </section>
  );
}
