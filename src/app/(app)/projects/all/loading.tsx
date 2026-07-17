function QuickActionSkeleton() {
  return (
    <div className="flex min-h-[92px] w-full max-w-[280px] shrink-0 flex-col items-start gap-2 overflow-hidden rounded-[10px] border-2 border-[#D7DDE5] bg-[#F3F5F8] p-2.5 shadow-[0_1px_0_rgba(15,23,42,0.015),0_6px_14px_rgba(15,23,42,0.035)] dark:border-[#3F3F3F] dark:bg-[#2B2B2B] dark:shadow-[0_6px_14px_rgba(0,0,0,0.18)]">
      <span className="h-9 w-9 rounded-2xl bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
      <span className="h-4 w-24 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
      <span className="h-3.5 w-36 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
      <span className="h-3 w-16 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
    </div>
  );
}

function ProjectRowSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-slate-100 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)_auto] md:items-center md:gap-6">
      <div className="space-y-2">
        <div className="h-4 w-44 rounded-full bg-slate-100 skeleton-shimmer" />
        <div className="h-3.5 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
      </div>
      <div className="hidden space-y-2 md:block">
        <div className="h-4 w-40 rounded-full bg-slate-100 skeleton-shimmer" />
        <div className="h-3.5 w-24 rounded-full bg-slate-100 skeleton-shimmer" />
      </div>
      <div className="flex items-center justify-end">
        <div className="h-9 w-[140px] rounded-xl bg-slate-100 skeleton-shimmer" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main
      className="box-border flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-white pt-3 pb-0 dark:bg-[#252525] md:pt-6 md:pb-0"
      style={{
        height:
          "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px) - var(--home-topbar-offset, 0px))",
      }}
    >
      <div className="h-full min-h-0 w-full">
        <div className="projects-content-grid flex h-full w-full min-h-0 flex-col">
          <div
            id="home-projects-container"
            className="relative z-40 flex h-full min-h-0 w-full flex-col px-0 pt-0 md:pl-1 md:pr-0"
          >
            <div className="flex h-full min-h-0 w-full flex-col">
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-visible">
                <section className="shrink-0 space-y-4">
                  <div className="relative">
                    <div className="flex gap-3 overflow-x-auto pb-2 pr-12 pl-1 md:pr-16 md:pl-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <QuickActionSkeleton key={index} />
                      ))}
                    </div>
                  </div>
                </section>

                <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="shrink-0 border-b border-[#E6EBF2] bg-white dark:border-[#3F3F3F] dark:bg-[#252525]">
                    <div className="flex flex-col gap-2.5 py-2.5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="h-7 w-36 rounded-full bg-slate-100 skeleton-shimmer" />
                      <div className="flex min-w-0 flex-1 items-center gap-3 lg:justify-end">
                        <div className="flex h-10 min-w-0 w-full flex-[0_1_440px] items-center gap-2 rounded-xl border border-[#E6EBF2] bg-white px-3 shadow-sm dark:border-[#3F3F3F] dark:bg-[#323232]">
                          <div className="h-4.5 w-4.5 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                          <div className="h-4 w-48 rounded-full bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                        </div>
                        <div className="inline-flex items-center rounded-xl border border-[#E6EBF2] bg-white p-1 shadow-sm dark:border-[#3F3F3F] dark:bg-[#323232]">
                          <div className="h-8 w-[92px] rounded-lg bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                          <div className="h-8 w-[92px] rounded-lg bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                        </div>
                        <div className="h-10 w-[132px] rounded-xl bg-slate-200 skeleton-shimmer dark:bg-[#3A3A3A]" />
                      </div>
                    </div>
                  </div>

                  <div className="grid min-h-0 gap-4 overflow-hidden pt-6 xl:grid-cols-[minmax(0,1.32fr)_minmax(0,0.68fr)] xl:gap-6">
                    <section className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 dark:border-[#3F3F3F] dark:bg-[#323232]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="h-6 w-24 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                        <div className="h-4 w-28 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                      </div>
                      <div className="mt-4 flex flex-1 flex-col md:mt-5">
                        <ProjectRowSkeleton />
                        <ProjectRowSkeleton />
                        <ProjectRowSkeleton />
                      </div>
                    </section>

                    <section className="hidden min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:flex dark:border-[#3F3F3F] dark:bg-[#323232]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="h-6 w-36 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                        <div className="h-4 w-28 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                      </div>
                      <div className="mt-5 flex flex-1 flex-col gap-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-100 py-3 last:border-b-0 dark:border-[#3F3F3F]">
                            <div className="space-y-2">
                              <div className="h-4 w-44 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                              <div className="h-3.5 w-28 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                            </div>
                            <div className="flex items-center justify-end">
                              <div className="h-4 w-4 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 dark:border-[#3F3F3F] dark:bg-[#323232] xl:col-start-1 xl:row-start-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="h-6 w-32 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                        <div className="h-4 w-32 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                      </div>
                      <div className="mt-4 space-y-4 md:mt-5">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 py-4 md:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)_auto] md:items-center md:gap-6">
                            <div className="space-y-2">
                              <div className="h-4 w-44 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                              <div className="h-3.5 w-28 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-4 w-40 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                              <div className="h-3.5 w-24 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                            </div>
                            <div className="flex items-center justify-end">
                              <div className="h-4 w-4 rounded-full bg-slate-100 skeleton-shimmer dark:bg-[#3A3A3A]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
