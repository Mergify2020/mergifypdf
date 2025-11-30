import Image from "next/image";

export default function PersonaHighlight() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl py-8 lg:py-12">
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
          <div className="pointer-events-none absolute inset-0 flex items-start justify-start pt-4 pl-4 sm:pt-6 sm:pl-8">
            <div className="pointer-events-auto flex max-w-sm rounded-2xl bg-[#0D1B2A] px-8 py-10 text-white shadow-2xl sm:px-8 sm:py-12">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300 sm:text-xs">
                  Built for every workflow
                </p>
                <h2 className="mt-2 text-2xl font-semibold leading-snug sm:mt-3 sm:text-3xl">
                  Perfect for One Person or an Entire Team
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
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
