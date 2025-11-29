import Image from "next/image";

export default function PersonaHighlight() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-0 lg:py-20">
        <div className="relative mx-auto max-w-5xl">
          {/* Dominant background image card */}
          <div className="ml-10 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
            <div className="relative h-[260px] w-full sm:h-[300px] lg:h-[340px]">
              <Image
                src="/hero-team4.svg"
                alt="Team collaborating with documents in the MergifyPDF workspace"
                fill
                sizes="(min-width: 1024px) 100vw, 100vw"
                className="h-full w-full object-cover"
                priority={false}
              />
            </div>
          </div>

          {/* Floating dark content card overlapping left edge by ~40px */}
          <div className="pointer-events-none absolute left-0 top-1/2 flex -translate-y-1/2 justify-start">
            <div className="pointer-events-auto w-full max-w-xs rounded-2xl bg-[#0D1B2A] px-6 py-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.7)] sm:max-w-sm sm:px-7 sm:py-6 lg:max-w-[40%]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 sm:text-xs">
                Built for real workflows
              </p>
              <h2 className="mt-3 text-xl font-semibold leading-snug sm:mt-4 sm:text-2xl lg:text-3xl">
                For Individuals, Freelancers, Realtors, and more!
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-slate-300 sm:mt-4 sm:text-sm">
                Whether you&apos;re closing deals, studying, or sending out
                proposals, MergifyPDF keeps every document clean, organized, and
                ready to sign.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
