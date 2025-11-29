import Image from "next/image";

export default function PersonaHighlight() {
  return (
    <section className="bg-[#F9FAFB]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 sm:px-6 lg:flex-row lg:px-0 lg:py-20">
        <div className="relative z-10 max-w-lg rounded-3xl bg-slate-900 px-8 py-9 text-white shadow-[0_28px_80px_rgba(15,23,42,0.6)] lg:my-auto lg:-mr-24">
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

        <div className="relative flex-1">
          <div className="relative h-80 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:h-96 lg:h-[430px]">
            <Image
              src="/hero-solo.svg"
              alt="Person working with documents in the MergifyPDF workspace"
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
              priority={false}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
