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

          {/* Soft left-to-right navy gradient overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 15% 15%, rgba(7, 21, 36, 0.95) 0%, rgba(7, 21, 36, 0.75) 28%, rgba(7, 21, 36, 0.45) 48%, rgba(7, 21, 36, 0.2) 68%, rgba(7, 21, 36, 0.05) 82%, rgba(7, 21, 36, 0) 100%)",
            }}
            aria-hidden="true"
          />

          {/* Text over gradient */}
          <div className="pointer-events-none absolute inset-0 flex items-start justify-start pt-3 pl-3 sm:pt-4 sm:pl-6">
            <div className="pointer-events-auto flex max-w-xl md:max-w-2xl px-8 py-10 text-white sm:px-10 sm:py-12">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 sm:text-xs">
                  Built for every workflow
                </p>
                <h2 className="mt-2 text-2xl font-semibold leading-snug sm:mt-3 sm:text-3xl sm:whitespace-nowrap">
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
