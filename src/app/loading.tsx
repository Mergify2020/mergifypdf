export default function Loading() {
  return (
    <main className="min-h-screen w-full bg-slate-100 px-2 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <div
        className="relative z-40 mx-auto mb-6 flex min-h-[calc(100vh-4rem)] w-full flex-col rounded-[32px] border border-slate-200/70 bg-white px-4 pb-12 pt-14 shadow-[0_18px_50px_rgba(15,23,42,0.10)] sm:mb-8 sm:px-6 lg:px-10"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(81, 189, 255, 0.55) 0%, rgba(0, 138, 222, 0.35) 26%, rgba(255, 255, 255, 0) 72%)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 420px",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-[32px] bg-gradient-to-r from-slate-900/5 to-transparent"
        />

        <section className="pt-10 lg:pt-14">
          <div className="flex w-full flex-col items-center">
            <div className="mt-6 grid w-full max-w-4xl gap-4 sm:grid-cols-2">
              <div className="flex w-full flex-col items-center gap-2 rounded-[24px] border-[3px] border-slate-300 bg-white px-5 py-4 text-center shadow-sm">
                <div className="h-4 w-40 rounded-full skeleton-shimmer" />
                <div className="h-10 w-full max-w-xs rounded-[12px] skeleton-shimmer" />
              </div>
              <div className="flex w-full flex-col items-center gap-2 rounded-[24px] border-[3px] border-slate-300 bg-white px-5 py-4 text-center shadow-sm">
                <div className="h-4 w-56 rounded-full skeleton-shimmer" />
                <div className="h-10 w-full max-w-xs rounded-[12px] skeleton-shimmer" />
              </div>
            </div>

            <div className="mt-[50px] w-full max-w-4xl">
              <div className="relative overflow-hidden rounded-[999px] border-[3px] border-slate-300 bg-white px-6 py-5 shadow-sm">
                <div className="absolute inset-0 skeleton-shimmer opacity-50" />
                <div className="relative flex items-center gap-4">
                  <div className="h-7 w-7 rounded-full bg-white/70" />
                  <div className="h-6 w-full rounded-full bg-white/70" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7 w-full">
          <div className="pt-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="h-7 w-40 rounded-full skeleton-shimmer" />
              <div className="flex items-center gap-2">
                <div className="h-10 w-40 rounded-full skeleton-shimmer" />
                <div className="h-10 w-44 rounded-full skeleton-shimmer" />
              </div>
            </div>

            <div className="projects-grid mt-6 grid w-full grid-cols-[repeat(auto-fill,minmax(max(300px,calc(100%/6)),1fr))] gap-5">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`home-loading-project-${index}`}
                  className="flex flex-col text-left"
                >
                  <div className="relative rounded-[10px] bg-[#F9FAFC]">
                    <div className="relative m-[3px] aspect-[1.23/1] w-[calc(100%-6px)] overflow-hidden rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-[#EEF1F5]">
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
    </main>
  );
}
