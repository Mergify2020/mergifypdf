import RevealOnScroll from "@/components/RevealOnScroll";
import FaqAccordion from "@/components/FaqAccordion";

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

const FAQS = [
  {
    question: "What is MergifyPDF?",
    answer:
      "MergifyPDF is a browser-based workspace for working with documents. It brings essential document tools into one place so you can get things done quickly—without installs or complicated software.",
  },
  {
    question: "What’s included in the 7-day free trial?",
    answer:
      "You get full access to every tool and workspace feature for 7 days—free. We’ll remind you before the trial ends.",
  },
  {
    question: "Is MergifyPDF secure?",
    answer:
      "Yes. Your documents are protected using encryption and strict access controls designed to keep your files private.",
  },
  {
    question: "Does MergifyPDF have an app?",
    answer:
      "No app is required. MergifyPDF works directly in your browser on desktop and mobile, so you can start instantly. We’re actively developing a dedicated app.",
  },
  {
    question: "Who is MergifyPDF best for?",
    answer:
      "MergifyPDF is ideal for anyone who works with documents regularly and wants powerful tools without the complexity of traditional document software.",
  },
];

export default function HeroFeatureArea() {
  return (
    <section id="features" className="bg-[#F6F8FF]">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
        {/* Feature grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {FEATURE_BOXES.map((feature, index) => (
            <RevealOnScroll
              key={feature.title}
              delayMs={index * 80}
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
            </RevealOnScroll>
          ))}
        </div>

        <div className="mt-12 border-t border-slate-200/70 pt-10 pb-8 sm:pb-10">
          <RevealOnScroll as="div">
            <h2 className="text-center text-[1.65rem] font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Why choose MergifyPDF
            </h2>
          </RevealOnScroll>
          <div className="mt-8 grid grid-cols-1 gap-6 text-center sm:grid-cols-2 lg:grid-cols-4 lg:text-left">
            <RevealOnScroll className="relative flex h-full flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 text-center shadow-[0_1px_3px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-shadow duration-200 hover:border-slate-300 hover:shadow-[0_0_0_1px_rgba(148,163,184,0.35)] sm:items-start sm:text-left" delayMs={0}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 via-white to-indigo-100 text-indigo-600/70 ring-1 ring-indigo-100/70">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
                  <path
                    d="M6 5h12a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M8 3v4M16 3v4M4 10h16M8 14h3M13 14h3"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-900">Free 3-day trial</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Try every feature risk-free. No commitment.
              </p>
            </RevealOnScroll>
            <RevealOnScroll className="relative flex h-full flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 text-center shadow-[0_1px_3px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-shadow duration-200 hover:border-slate-300 hover:shadow-[0_0_0_1px_rgba(148,163,184,0.35)] sm:items-start sm:text-left" delayMs={80}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 via-white to-indigo-100 text-indigo-600/70 ring-1 ring-indigo-100/70">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
                  <path
                    d="M5 7.5 12 12l7-4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M5 12.5 12 17l7-4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-900">Start in seconds</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                No downloads. No setup. Just upload and go.
              </p>
            </RevealOnScroll>
            <RevealOnScroll className="relative flex h-full flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 text-center shadow-[0_1px_3px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-shadow duration-200 hover:border-slate-300 hover:shadow-[0_0_0_1px_rgba(148,163,184,0.35)] sm:items-start sm:text-left" delayMs={160}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 via-white to-indigo-100 text-indigo-600/70 ring-1 ring-indigo-100/70">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
                  <path
                    d="M13.5 2 5 13h5l-1 9 9.5-12h-5L13.5 2Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-900">Built for speed</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Merge, edit, and send in seconds — even large files.
              </p>
            </RevealOnScroll>
            <RevealOnScroll className="relative flex h-full flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 text-center shadow-[0_1px_3px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-shadow duration-200 hover:border-slate-300 hover:shadow-[0_0_0_1px_rgba(148,163,184,0.35)] sm:items-start sm:text-left" delayMs={240}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 via-white to-indigo-100 text-indigo-600/70 ring-1 ring-indigo-100/70">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
                  <path
                    d="M4 8l8-4 8 4-8 4-8-4Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M4 12l8 4 8-4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M4 16l8 4 8-4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-900">All-in-one workspace</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Edit, merge, and collect signatures without switching tools.
              </p>
            </RevealOnScroll>
          </div>
        </div>

        <div className="mt-12 mb-0 border-t border-slate-200/70 pt-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="grid w-full items-center gap-8 text-center lg:grid-cols-[1.1fr_0.9fr] lg:text-left xl:grid-cols-[1fr_1fr]">
            <RevealOnScroll as="div" className="flex justify-center lg:justify-start">
              <img
                src="/illustrations/hero-ipad-illustration.png"
                alt=""
                className="h-auto w-auto max-h-72 rounded-xl border border-slate-200/70 shadow-[0_10px_28px_rgba(15,23,42,0.10)] sm:max-h-80 lg:max-h-96"
                aria-hidden="true"
              />
            </RevealOnScroll>
            <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
              <RevealOnScroll as="div">
                <p className="text-center text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-[2.75rem] xl:text-[3.25rem] lg:text-left">
                  <span className="block">Do more with your</span>
                  <span className="block whitespace-nowrap">documents — for less.</span>
                </p>
                <p className="text-center text-base text-slate-600 sm:text-lg lg:text-left">
                  No installs. No delays. Just the tools you need, at a fraction of the cost.
                </p>
              </RevealOnScroll>
              <RevealOnScroll as="div" delayMs={120}>
                <a
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-gradient-to-r from-[#6D5EF3] to-[#8B7CFF] px-8 py-2.5 text-base font-semibold text-white shadow-[0_12px_26px_rgba(109,94,243,0.25)] transition hover:-translate-y-0.5 hover:from-[#7567F5] hover:to-[#9486FF]"
                >
                  Start free trial
                </a>
              </RevealOnScroll>
            </div>
          </div>
          </div>
        </div>

        <div className="mt-12 mb-10 border-t border-slate-200/70 pt-10">
          <RevealOnScroll as="div">
            <h2 className="text-center text-2xl font-semibold text-slate-900 sm:text-3xl">
              Frequently Asked Questions
            </h2>
          </RevealOnScroll>
          <FaqAccordion items={FAQS} />
        </div>

      </div>
    </section>
  );
}
