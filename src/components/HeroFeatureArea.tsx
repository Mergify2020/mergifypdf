import LandingPricingCards from "@/components/LandingPricingCards";
import RevealOnScroll from "@/components/RevealOnScroll";
import FaqAccordion from "@/components/FaqAccordion";

const FEATURE_CARDS = [
  { title: "Merge Documents", description: "Combine PDFs into one file.", emoji: "🧩" },
  { title: "Reorder Pages", description: "Move pages into the right order.", emoji: "↕️" },
  { title: "Edit & Annotate", description: "Add notes, highlights, and markups.", emoji: "📝" },
  { title: "Sign Documents", description: "Add signatures in the browser.", emoji: "✍️" },
  { title: "Compress PDFs", description: "Reduce file size without losing quality.", emoji: "📦" },
  { title: "Split PDFs", description: "Split large PDFs into smaller files.", emoji: "✂️" },
  { title: "Add or Remove Pages", description: "Build the final version easily.", emoji: "➕" },
  { title: "Extract Pages", description: "Pull out only the pages you need.", emoji: "📄" },
  { title: "Rotate Pages", description: "Fix page orientation fast.", emoji: "🔁" },
  { title: "Add Text", description: "Type directly on any page.", emoji: "🅰️" },
  { title: "Collect Signatures", description: "Send docs out and track approvals.", emoji: "✅" },
  { title: "Watermark PDFs", description: "Add a visible mark for sharing.", emoji: "💧" },
  { title: "Convert Files", description: "Convert PDFs and clean files fast.", emoji: "🔄" },
  { title: "Organize Documents", description: "Keep pages and versions organized.", emoji: "🗂️" },
  { title: "Add Images", description: "Add logos, photos, or visuals.", emoji: "🖼️" },
  { title: "Forms & Templates", description: "Fill fields and reuse layouts.", emoji: "📋" },
];



export default function HeroFeatureArea() {
  return (
    <section id="features" className="relative overflow-hidden text-white">
      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-14 pt-12 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
        <RevealOnScroll as="div" className="mx-auto max-w-3xl text-center">
          <h2 className="mt-3 text-balance text-[clamp(2rem,4vw,3.5rem)] font-semibold tracking-[-0.05em] text-white">
            Handle every PDF task in one place.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-7 text-white/68 sm:text-lg">
            Merge, edit, sign, compress, and organize files without jumping between tools.
          </p>
        </RevealOnScroll>

        <div className="mt-10">
          <RevealOnScroll as="div" delayMs={40} className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
              {FEATURE_CARDS.map((feature, index) => {
                const accentClass =
                  index % 4 === 0
                    ? "from-[#8B7CFF]/22 to-[#C1BAFF]/12"
                    : index % 4 === 1
                      ? "from-[#6D5EF3]/22 to-[#8B7CFF]/12"
                      : index % 4 === 2
                        ? "from-[#4F8CFF]/22 to-[#7EB8FF]/12"
                        : "from-[#A56BFF]/22 to-[#C98BFF]/12";

                return (
                  <article
                    key={feature.title}
                    className="group relative min-h-[168px] overflow-hidden rounded-[24px] border border-white/14 bg-white/[0.075] p-4 text-left shadow-[0_16px_36px_rgba(0,0,0,0.22)] ring-1 ring-white/5 backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/24 hover:bg-white/[0.1] hover:shadow-[0_24px_52px_rgba(139,124,255,0.22)] sm:min-h-[176px] md:min-h-[182px] lg:min-h-[190px] xl:min-h-[196px] sm:p-4 lg:p-5 xl:p-6"
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentClass}`} />
                    <div className="relative flex h-full flex-col gap-2.5 sm:gap-3 lg:gap-3.5">
                      <span className="mb-1 inline-block text-[1.45rem] leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.28)] sm:text-[1.6rem] lg:text-[1.9rem] xl:text-[2.1rem]" aria-hidden="true">{feature.emoji}</span>
                      <div className="min-w-0">
                        <h3 className="text-pretty text-[0.92rem] font-semibold tracking-[-0.02em] text-white/96 sm:text-[1rem] lg:text-[1.08rem] xl:text-[1.15rem]">
                          {feature.title}
                        </h3>
                        <p className="mt-1 text-[0.8rem] leading-5 text-white/72 sm:text-[0.9rem] lg:text-[0.92rem] lg:leading-6 xl:text-[0.96rem] xl:leading-6">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </RevealOnScroll>
        </div>

        <section className="mt-14">
          <RevealOnScroll as="div" variant="fade">
            <h2 className="mt-3 text-center text-[clamp(2rem,4vw,3.25rem)] font-semibold tracking-tight text-white">
              Plans made for everyday PDF work.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-white/68 sm:text-base">
              Pick the plan that fits your workflow. Upgrade, switch, or cancel anytime.
            </p>
          </RevealOnScroll>
          <div className="mx-auto mt-10 w-full max-w-6xl">
            <LandingPricingCards />
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 mt-16 pb-12 pt-2 sm:pb-14 lg:pb-16">
          <FaqAccordion
            variant="dark"
            items={[
              {
                question: "What is MergifyPDF?",
                answer:
                  "MergifyPDF is a browser-based PDF workspace for merging, editing, signing, and organizing files in one place.",
              },
              {
                question: "Can I switch plans later?",
                answer: "Yes. You can upgrade, switch, or manage billing from your account whenever your workflow changes.",
              },
              {
                question: "Is MergifyPDF secure?",
                answer: "Yes. Your documents are protected with encryption and access controls designed to keep files private.",
              },
              {
                question: "Does MergifyPDF have an app?",
                answer: "No app is required. It works directly in your browser on desktop and mobile.",
              },
              {
                question: "Who is MergifyPDF best for?",
                answer:
                  "It is best for people and teams who handle PDFs regularly and want a faster workflow than traditional document software.",
              },
            ]}
          />
        </section>
      </div>
    </section>
  );
}
