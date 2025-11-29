import Image from "next/image";

export default function PersonaHighlight() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-0 lg:py-20">
        <div className="relative mx-auto w-full max-w-6xl">
          {/* Background with photo – fills rounded container on all sides */}
          <div className="relative h-[640px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
            <Image
              src="/hero-team4.svg"
              alt="Team collaborating with documents in the MergifyPDF workspace"
              fill
              sizes="(min-width: 1024px) 100vw, 100vw"
              className="object-cover object-[62%_45%] scale-110"
              priority={false}
            />
          </div>

          {/* Floating text card */}
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
            <div className="pointer-events-auto max-w-sm rounded-2xl bg-[#0D1B2A] px-8 py-16 text-white shadow-2xl sm:px-8 sm:py-16">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300 sm:text-xs">
                Built for real workflows
              </p>
              <h2 className="mt-2 text-2xl font-semibold leading-snug sm:mt-3 sm:text-3xl">
                For Individuals, Freelancers, Realtors, and more!
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
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
