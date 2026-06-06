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
        <RevealOnScroll as="div" className="mx-auto max-w-3xl text-center">          <h2 className="mt-3 text-balance text-[clamp(2rem,4vw,3.5rem)] font-semibold tracking-[-0.05em] text-white">
            Handle every PDF task in one place.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-7 text-white/68 sm:text-lg">
            Merge, edit, sign, compress, and organize files without jumping between tools.
          </p>
        </RevealOnScroll>

        <div className="mt-10">
          <RevealOnScroll as="div" delayMs={40} className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
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
                    className="group relative h-[180px] overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] p-5 text-left shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/18 hover:bg-white/[0.06] hover:shadow-[0_18px_42px_rgba(139,124,255,0.16)] sm:h-[184px] lg:h-[188px]"
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentClass}`} />
                    <div className="relative flex h-full flex-col gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br shadow-[0_8px_18px_rgba(0,0,0,0.18)] ${accentClass} border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]`}>
                        <span className="text-[1.45rem] leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.28)]" aria-hidden="true">{feature.emoji}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="line-clamp-1 text-[1rem] font-semibold tracking-[-0.02em] text-white sm:text-[1.05rem]">
                          {feature.title}
                        </h3>
                        <p className="line-clamp-2 mt-1 text-sm leading-6 text-white/62">
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
            <p className="text-center text-[12px] font-semibold uppercase tracking-[0.24em] text-white/60">
              Pricing
            </p>
            <h2 className="mt-3 text-center text-[clamp(2rem,4vw,3.25rem)] font-semibold tracking-tight text-white">
              Pick a plan.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-white/68 sm:text-base">
              Choose Essential Plus for your own documents, or Signature Pro when you send files out for signatures.
            </p>
          </RevealOnScroll>
          <div className="mx-auto mt-10 w-full max-w-6xl">
            <LandingPricingCards />
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 mt-16 pt-2">
          <FaqAccordion
            variant="dark"
            items={[
              {
                question: "What is MergifyPDF?",
                answer:
                  "MergifyPDF is a browser-based PDF workspace for merging, editing, signing, and organizing files in one place.",
              },
              {
                question: "What’s included in the 3-day free trial?",
                answer: "You get full access to every tool for 3 days. We’ll remind you before the trial ends.",
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
