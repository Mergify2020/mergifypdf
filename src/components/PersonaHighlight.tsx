import Image from "next/image";

export default function PersonaHighlight() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl py-14 lg:py-20">
        <div className="relative w-full overflow-hidden rounded-3xl shadow-xl">
          <Image
            src="/Hero-team10.svg"
            alt="Team collaborating with documents in the MergifyPDF workspace"
            width={1440}
            height={810}
            className="w-full h-auto"
            priority={false}
          />

          {/* Floating text card */}
          <div className="pointer-events-none absolute inset-0 flex items-start justify-end pt-4 pr-4 sm:pt-6 sm:pr-8">
            <div className="pointer-events-auto flex max-w-sm rounded-2xl bg-[#0D1B2A] px-8 py-10 text-white shadow-2xl sm:px-8 sm:py-12">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300 sm:text-xs">
                  Built for real workflows
                </p>
                <h2 className="mt-2 text-2xl font-semibold leading-snug sm:mt-3 sm:text-3xl">
                  For Individuals, Freelancers, Realtors, and more!
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Whether you&apos;re closing deals, studying, or sending out
                  proposals, MergifyPDF keeps every document clean, organized,
                  and ready to sign.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
