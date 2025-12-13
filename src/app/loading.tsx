export default function Loading() {
  return (
    <main className="min-h-screen w-full bg-slate-100 px-2 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <div className="mx-auto mb-6 flex min-h-[calc(100vh-4rem)] w-full flex-col rounded-[32px] border border-white/70 bg-white px-4 pb-12 pt-14 sm:mb-8 sm:px-6 lg:px-10">
        <div className="w-full">
          <section>
            <header className="flex flex-col items-center justify-center text-center">
              <div className="h-6 w-56 rounded-full skeleton-shimmer sm:h-7" />
              <div className="mt-3 h-12 w-full max-w-[520px] rounded-full skeleton-shimmer sm:h-14 lg:h-16" />
            </header>

            <div className="mt-10 flex justify-center">
              <div className="w-full max-w-4xl rounded-[42px] border border-[#0f6fb8] bg-white/95 px-5 py-3 text-[#013d63] shadow-[0_8px_20px_rgba(15,111,184,0.16)]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col items-center gap-2 sm:pr-5">
                    <div className="h-4 w-40 rounded-full skeleton-shimmer" />
                    <div className="h-9 w-full max-w-xs rounded-[10px] skeleton-shimmer" />
                  </div>
                  <div className="flex flex-col items-center gap-2 pt-3 sm:border-l sm:border-slate-300 sm:pl-5 sm:pt-0">
                    <div className="h-4 w-56 rounded-full skeleton-shimmer" />
                    <div className="h-9 w-full max-w-xs rounded-[10px] skeleton-shimmer" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-center">
              <div className="w-full max-w-4xl">
                <div className="relative overflow-hidden rounded-[999px] border border-slate-200 bg-white px-6 py-[18px] shadow-[0_8px_25px_rgba(15,111,184,0.16)]">
                  <div className="absolute inset-0 skeleton-shimmer opacity-60" />
                  <div className="relative h-6 w-full rounded-full bg-white/60" />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-7 w-full">
            <div className="pt-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="h-6 w-40 rounded-full skeleton-shimmer sm:h-7" />
              </div>
              <div className="projects-grid mt-6 grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    className="flex flex-col text-left"
                  >
                    <div className="relative rounded-[10px] bg-[#F9FAFC]">
                      <div className="relative m-[3px] w-[calc(100%-6px)] aspect-[1.23/1] overflow-hidden rounded-[10px] bg-[#EEF1F5] border border-[rgba(0,0,0,0.06)]">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                    </div>
                    <div className="mt-4 space-y-0.5">
                      <div className="h-5 w-2/3 rounded-full skeleton-shimmer" />
                      <div className="h-4 w-1/2 rounded-full skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <div className="h-10 w-44 rounded-[12px] skeleton-shimmer" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
