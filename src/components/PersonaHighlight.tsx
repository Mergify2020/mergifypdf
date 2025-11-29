import Image from "next/image";

export default function PersonaHighlight() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-0 lg:py-20">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
          <div className="grid min-h-[260px] grid-cols-1 lg:grid-cols-2">
            {/* Left column: dark text box */}
            <div className="flex h-full items-center bg-slate-900/95 px-8 py-9 text-white">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Built for real workflows
                </p>
                <h2 className="mt-4 text-3xl font-semibold leading-snug sm:text-4xl">
                  For Individuals, Freelancers, Realtors, and more!
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                  Whether you&apos;re closing deals, studying, or sending out
                  proposals, MergifyPDF keeps every document clean, organized,
                  and ready to sign.
                </p>
              </div>
            </div>

            {/* Right column: full-bleed image, no padding */}
            <div className="relative h-full w-full overflow-hidden">
              <Image
                src="/hero-team4.svg"
                alt="Team collaborating with documents in the MergifyPDF workspace"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="h-full w-full object-cover"
                priority={false}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
