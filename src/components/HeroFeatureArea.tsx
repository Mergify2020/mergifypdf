import Image from "next/image";

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

type PersonaCard = {
  id: string;
  title: string;
  benefits: string[];
  imageSrc: string;
  imageAlt: string;
};

const PERSONA_CARDS: PersonaCard[] = [
  {
    id: "freelancer",
    title: "For Freelancers",
    benefits: ["Sign forms fast", "Merge PDFs easily"],
    imageSrc: "/personas/freelancer.jpg",
    imageAlt: "Freelancer working on a laptop in a bright workspace",
  },
  {
    id: "realtor",
    title: "For Realtors",
    benefits: ["Reorder pages in seconds", "Combine contracts into one file"],
    imageSrc: "/personas/realtor.jpg",
    imageAlt: "Real estate professional reviewing documents in an office",
  },
  {
    id: "student",
    title: "For Students",
    benefits: ["Annotate and highlight PDFs", "Keep study materials organized"],
    imageSrc: "/personas/student.jpg",
    imageAlt: "Student studying with a laptop and notes",
  },
  {
    id: "business",
    title: "For Businesses",
    benefits: ["Streamline team PDF workflows", "Keep every document in sync"],
    imageSrc: "/personas/business-team.jpg",
    imageAlt: "Small business team collaborating around a desk",
  },
];

export default function HeroFeatureArea() {
  return (
    <>
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

      <section className="bg-[#F9FAFB]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-0">
          <div className="mb-8 text-center">
            <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
              Who it&apos;s for
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Thoughtfully designed for the modern people behind every document.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {PERSONA_CARDS.map((card) => (
              <article
                key={card.id}
                className="relative flex h-72 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm"
              >
                <div className="relative h-full w-full">
                  <Image
                    src={card.imageSrc}
                    alt={card.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 240px, (min-width: 768px) 45vw, 90vw"
                    className="object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/40 via-slate-900/10 to-transparent" />

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-4">
                    <div className="pointer-events-auto w-[88%] rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 text-left shadow-md backdrop-blur">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {card.title}
                      </h3>
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                        {card.benefits.map((benefit) => (
                          <li key={benefit}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
