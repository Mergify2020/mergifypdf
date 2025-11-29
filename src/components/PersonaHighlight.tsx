import Image from "next/image";

export default function PersonaHighlight() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-0 lg:py-20">
        <div className="relative mx-auto max-w-5xl">
          {/* Background image panel */}
          <div className="h-[22rem] w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:h-[26rem] lg:h-[460px]">
            <Image
              src="/hero-team4.svg"
              alt="Team collaborating with documents in the MergifyPDF workspace"
              fill
              sizes="(min-width: 1024px) 100vw, 100vw"
              className="object-cover"
              priority={false}
            />
          </div>

          {/* Floating dark box above the picture */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-start px-4 sm:px-8">
            <div className="pointer-events-auto max-w-lg rounded-3xl bg-slate-900/95 px-8 py-9 text-white shadow-[0_24px_70px_rgba(15,23,42,0.75)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Built for real workflows
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-snug sm:text-4xl">
                For Individuals, Freelancers, Realtors, and more!
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
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
