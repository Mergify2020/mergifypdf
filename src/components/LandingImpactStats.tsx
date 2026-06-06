import RevealOnScroll from "@/components/RevealOnScroll";

const IMPACT_STATS = [
  {
    value: "20,000+",
    label: "Hours saved every year",
  },
  {
    value: "100,000+",
    label: "Documents processed",
  },
  {
    value: "60,000+",
    label: "Files signed",
  },
] as const;

export default function LandingImpactStats() {
  return (
    <section className="relative z-10 overflow-visible text-white -mb-6 sm:-mb-8">
      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-6 lg:px-8 lg:pb-24 lg:pt-8">
        <RevealOnScroll as="div" className="mx-auto max-w-4xl text-center">
          <h2 className="text-balance text-[clamp(1.85rem,3.1vw,3.2rem)] font-semibold tracking-[-0.04em] text-white whitespace-nowrap">
            Turn PDF busywork into saved time.
          </h2>
        </RevealOnScroll>

        <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-12 lg:gap-5">
          {IMPACT_STATS.map((stat, index) => (
            <RevealOnScroll
              key={stat.label}
              as="article"
              delayMs={index * 120}
              className={`h-full lg:col-span-4 ${
                index === 1 ? "lg:translate-y-6" : index === 2 ? "lg:translate-y-12" : ""
              }`}
            >
              <div className="relative h-full min-h-[176px] overflow-hidden rounded-[24px] border-[1.5px] border-[#8b7cff]/35 bg-white/[0.045] p-6 shadow-[0_18px_42px_rgba(139,124,255,0.1)] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.015] hover:border-[#d1ccff]/55 hover:bg-white/[0.06] hover:shadow-[0_26px_60px_rgba(139,124,255,0.18)] sm:p-7">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8b7cff]/60 to-transparent" />
                <div className="relative flex h-full flex-col items-center justify-center text-center">
                  <div className="space-y-2">
                    <div className="text-[clamp(2.05rem,3.7vw,3.4rem)] font-medium tracking-[-0.05em] text-white">
                      {stat.value}
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#9d94ff] sm:text-[11px]">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
