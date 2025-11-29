import Image from "next/image";

export default function PersonaHighlight() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-0 lg:py-20">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
          {/* Dominant background image */}
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

          {/* Overlapping dark content card */}
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-start px-4 sm:px-6 lg:px-8">
            <div className="pointer-events-auto max-w-lg rounded-3xl bg-slate-900/95 px-7 py-7 text-white shadow-[0_22px_60px_rgba(15,23,42,0.7)] sm:px-8 sm:py-8 lg:-ml-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 sm:text-sm">
                Built for real workflows
              </p>
              <h2 className="mt-3 text-2xl font-semibold leading-snug sm:mt-4 sm:text-3xl lg:text-4xl">
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
