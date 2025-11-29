import Image from "next/image";

export default function PersonaHighlight() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-0 lg:py-20">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-stretch">
          {/* Left column: dark content box */}
          <div className="lg:flex-[1.05]">
            <div className="flex h-full items-center rounded-3xl bg-slate-900/95 px-8 py-9 text-white shadow-[0_24px_70px_rgba(15,23,42,0.75)]">
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
          </div>

          {/* Right column: image fills full column, no extra white space */}
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
            <Image
              src="/hero-team4.svg"
              alt="Team collaborating with documents in the MergifyPDF workspace"
              width={1440}
              height={720}
              className="h-full w-full object-cover"
              priority={false}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
