import Image from "next/image";

export default function PersonaHighlight() {
  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:py-12">
        <div className="relative w-full overflow-hidden rounded-3xl shadow-xl">
          <Image
            src="/Hero-team10.svg"
            alt="Team collaborating with documents in the MergifyPDF workspace"
            width={1440}
            height={810}
            className="w-full h-auto"
            priority={false}
          />

          {/* Text card over image */}
          <div className="pointer-events-none absolute inset-x-6 top-1/2 flex -translate-y-1/2 justify-center md:inset-x-auto md:left-10 md:top-10 md:translate-y-0 md:justify-start">
            <div className="pointer-events-auto max-w-[360px] rounded-3xl bg-[rgba(7,21,36,0.88)] px-6 py-6 text-white text-sm shadow-[0_18px_45px_rgba(0,0,0,0.24)] scale-[0.8] sm:max-w-[440px] sm:px-8 sm:py-10 sm:text-base sm:scale-100">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 sm:text-xs">
                  Built for every workflow
                </p>
                <h2 className="mt-2 text-2xl font-semibold leading-snug sm:mt-3 sm:text-3xl">
                  Perfect for One Person or an Entire Team
                </h2>
                <p className="mt-3 max-w-[36rem] text-sm leading-relaxed text-slate-100 sm:text-base">
                  Whether you&apos;re working solo or collaborating with others,
                  MergifyPDF makes editing, organizing, and signing documents
                  fast, simple, and reliable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
