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
    description: "Deliver one polished PDF from multiple files.",
    icon: "🧩",
  },
  {
    title: "Edit & Annotate",
    description: "Clarify feedback and approvals in one place.",
    icon: "✏️",
  },
  {
    title: "Sign Documents",
    description: "Collect signatures quickly without leaving the browser.",
    icon: "✍️",
  },
  {
    title: "Reorder Pages",
    description: "Present documents in the right story order.",
    icon: "🔀",
  },
  {
    title: "Add or Remove Pages",
    description: "Keep only what matters in the final file.",
    icon: "➕",
  },
  {
    title: "Extract Pages",
    description: "Share just the pages people actually need.",
    icon: "📤",
  },
  {
    title: "Rotate Pages",
    description: "Ensure every page reads perfectly.",
    icon: "🔁",
  },
  {
    title: "Split Documents",
    description: "Break large PDFs into ready-to-send parts.",
    icon: "✂️",
  },
];

export default function HeroFeatureArea() {
  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
        {/* Feature grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {FEATURE_BOXES.map((feature) => (
            <div
              key={feature.title}
              className="relative flex h-full flex-col items-center rounded-2xl border border-slate-200 bg-white/80 p-4 text-center shadow-[0_1px_3px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-shadow duration-200 hover:border-slate-300 hover:shadow-[0_0_0_1px_rgba(148,163,184,0.35)] sm:p-5"
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

        <div className="mt-6 mb-20 flex justify-center">
          <a
            href="/pricing"
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-gradient-to-r from-[#6D5EF3] to-[#8B7CFF] px-7 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-[#7567F5] hover:to-[#9486FF]"
          >
            Compare plans
          </a>
        </div>

        <div className="mt-10 mb-20 grid w-full items-center gap-8 text-center lg:grid-cols-[1.1fr_0.9fr] lg:text-left xl:grid-cols-[1fr_1fr]">
          <div className="flex justify-center lg:justify-start">
            <img
              src="/illustrations/hero-ipad-illustration.png"
              alt=""
              className="h-auto w-auto max-h-72 sm:max-h-80 lg:max-h-96"
              aria-hidden="true"
            />
          </div>
          <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
            <p className="text-center text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-[2.75rem] xl:text-[3.25rem] lg:text-left">
              <span className="block">Do more with your</span>
              <span className="block whitespace-nowrap">documents — for less.</span>
            </p>
            <p className="text-center text-base text-slate-600 sm:text-lg lg:text-left">
              No installs. No delays. Just the tools you need, at a fraction of the cost.
            </p>
            <a
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-gradient-to-r from-[#6D5EF3] to-[#8B7CFF] px-7 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:from-[#7567F5] hover:to-[#9486FF]"
            >
              Start free trial
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
