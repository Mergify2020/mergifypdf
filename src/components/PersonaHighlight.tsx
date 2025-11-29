import Image from "next/image";

export default function PersonaHighlight() {
  return (
    <section className="bg-[#F9FAFB]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:px-0 lg:py-16">
        <div className="relative z-10 max-w-md rounded-3xl bg-slate-900 px-6 py-7 text-white shadow-[0_20px_60px_rgba(15,23,42,0.45)] lg:my-auto lg:-mr-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Built for real workflows
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-snug sm:text-3xl">
            For Individuals, Freelancers, Realtors, and more!
          </h2>
          <p className="mt-3 text-sm text-slate-300">
            Whether you&apos;re closing deals, studying, or sending out
            proposals, MergifyPDF keeps every document clean, organized, and
            ready to sign.
          </p>
        </div>

        <div className="relative flex-1">
          <div className="relative h-72 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:h-80 lg:h-88">
            <Image
              src="/visual-hero2.jpeg"
              alt="People collaborating around documents in the MergifyPDF workspace"
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
              priority={false}
            />
          </div>

          {/* Black box overlap hint: ~20% of image width on large screens */}
          <div className="pointer-events-none absolute inset-y-4 left-0 w-[22%] rounded-3xl bg-slate-900/5 lg:block hidden" />
        </div>
      </div>
    </section>
  );
}

