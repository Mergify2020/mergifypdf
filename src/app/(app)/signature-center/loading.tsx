function RowSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid gap-3 py-4 ${
        compact
          ? "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]"
          : "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
      }`}
    >
      <div className="space-y-2">
        <div className="h-4 w-40 rounded-full bg-slate-100 skeleton-shimmer" />
        <div className="h-3.5 w-24 rounded-full bg-slate-100 skeleton-shimmer" />
      </div>
      <div className="space-y-2 md:block">
        <div className="h-4 w-32 rounded-full bg-slate-100 skeleton-shimmer" />
        <div className="h-3.5 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
      </div>
      <div className="flex items-center justify-end md:justify-end">
        <div className="h-9 w-[140px] rounded-xl bg-slate-100 skeleton-shimmer" />
      </div>
    </div>
  );
}

function SignedHistorySkeletonRow() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-1 py-3 md:grid md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_auto] md:items-center md:gap-4">
      <div className="space-y-2">
        <div className="h-4 w-44 rounded-full bg-slate-100 skeleton-shimmer" />
        <div className="h-3.5 w-24 rounded-full bg-slate-100 skeleton-shimmer" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-24 rounded-full bg-slate-100 skeleton-shimmer" />
        <div className="h-3.5 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
      </div>
      <div className="flex items-center justify-end">
        <div className="h-4 w-4 rounded-full bg-slate-100 skeleton-shimmer" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main
      className="box-border w-full bg-[#F1F4F9] pt-2 pb-0 md:pt-6 md:pb-0 dark:bg-[#252525]"
      style={{
        height:
          "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px) - var(--home-topbar-offset, 0px) - var(--workspace-content-bottom-subtract, var(--workspace-frame-gutter, 48px)))",
      }}
    >
      <div className="h-full min-h-0 w-full">
        <div className="h-full w-full">
          <div
            id="home-projects-container"
            className="relative z-40 flex h-full min-h-0 w-full flex-col px-0 pt-0 md:pl-1 md:pr-0"
          >
            <div className="flex h-full min-h-0 w-full flex-col">
              <div className="mt-0 flex w-full min-h-0 flex-1 flex-col">
                <div className="box-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-[1.5px] border-gray-200 bg-white p-3 shadow-sm md:p-5">
                  <div className="flex items-center justify-between gap-3 md:pl-[21px]">
                    <div className="h-8 w-56 rounded-full bg-slate-100 skeleton-shimmer" />
                    <div className="flex gap-2">
                      <div className="hidden h-9 w-[200px] rounded-xl bg-slate-100 skeleton-shimmer sm:block" />
                      <div className="h-9 w-[130px] rounded-xl bg-slate-100 skeleton-shimmer md:h-11" />
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-6 pt-6">
                    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-contain px-1 py-1 pb-24 md:gap-6 md:pb-1">
                      <div className="md:hidden">
                        <section className="py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="h-6 w-24 rounded-full bg-slate-100 skeleton-shimmer" />
                            <div className="h-4 w-24 rounded-full bg-slate-100 skeleton-shimmer" />
                          </div>
                          <div className="mt-4 divide-y divide-slate-100">
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-4">
                              <div className="min-w-0 space-y-2">
                                <div className="h-4 w-44 rounded-full bg-slate-100 skeleton-shimmer" />
                                <div className="h-3.5 w-24 rounded-full bg-slate-100 skeleton-shimmer" />
                                <div className="h-3.5 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
                              </div>
                              <div className="flex flex-col items-end justify-between gap-3">
                                <div className="h-4 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
                                <div className="h-9 w-[140px] rounded-xl bg-slate-100 skeleton-shimmer" />
                              </div>
                            </div>
                            <div className="h-px bg-slate-200/80" />
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-4">
                              <div className="min-w-0 space-y-2">
                                <div className="h-4 w-40 rounded-full bg-slate-100 skeleton-shimmer" />
                                <div className="h-3.5 w-24 rounded-full bg-slate-100 skeleton-shimmer" />
                                <div className="h-3.5 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
                              </div>
                              <div className="flex flex-col items-end justify-between gap-3">
                                <div className="h-4 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
                                <div className="h-9 w-[140px] rounded-xl bg-slate-100 skeleton-shimmer" />
                              </div>
                            </div>
                            <div className="h-px bg-slate-200/80" />
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-4">
                              <div className="min-w-0 space-y-2">
                                <div className="h-4 w-40 rounded-full bg-slate-100 skeleton-shimmer" />
                                <div className="h-3.5 w-24 rounded-full bg-slate-100 skeleton-shimmer" />
                                <div className="h-3.5 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
                              </div>
                              <div className="flex flex-col items-end justify-between gap-3">
                                <div className="h-4 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
                                <div className="h-9 w-[140px] rounded-xl bg-slate-100 skeleton-shimmer" />
                              </div>
                            </div>
                          </div>
                        </section>

                        <div className="my-4 h-px bg-slate-200/80" />
                      </div>

                      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1.32fr)_minmax(0,0.68fr)] xl:grid-rows-[auto_auto] xl:items-start xl:gap-6">
                        <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 xl:col-start-1 xl:row-start-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="h-6 w-24 rounded-full bg-slate-100 skeleton-shimmer" />
                            <div className="h-4 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
                          </div>
                          <div className="mt-4 flex flex-1 flex-col md:mt-5">
                            <RowSkeleton />
                            <div className="h-px bg-slate-200/80" />
                            <RowSkeleton />
                            <div className="h-px bg-slate-200/80" />
                            <RowSkeleton />
                          </div>
                        </section>

                        <section className="hidden h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:flex">
                          <div className="flex items-center justify-between gap-3">
                            <div className="h-6 w-36 rounded-full bg-slate-100 skeleton-shimmer" />
                            <div className="h-4 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
                          </div>
                          <div className="mt-5 flex flex-1 flex-col">
                            <SignedHistorySkeletonRow />
                            <div className="h-px bg-slate-100" />
                            <SignedHistorySkeletonRow />
                            <div className="h-px bg-slate-100" />
                            <SignedHistorySkeletonRow />
                            <div className="h-px bg-slate-100" />
                            <SignedHistorySkeletonRow />
                          </div>
                        </section>

                        <section
                          id="sent-requests"
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 xl:col-start-1 xl:row-start-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="h-6 w-32 rounded-full bg-slate-100 skeleton-shimmer" />
                            <div className="h-4 w-32 rounded-full bg-slate-100 skeleton-shimmer" />
                          </div>
                          <div className="mt-4 md:mt-5">
                            <div className="divide-y divide-slate-100">
                              {Array.from({ length: 4 }).map((_, index) => (
                                <div
                                  key={index}
                                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 py-4 md:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)_auto] md:items-center md:gap-6"
                                >
                                  <div className="space-y-2">
                                    <div className="h-4 w-44 rounded-full bg-slate-100 skeleton-shimmer" />
                                    <div className="h-3.5 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
                                  </div>
                                  <div className="space-y-2">
                                    <div className="h-4 w-40 rounded-full bg-slate-100 skeleton-shimmer" />
                                    <div className="h-3.5 w-24 rounded-full bg-slate-100 skeleton-shimmer" />
                                  </div>
                                  <div className="flex items-center justify-end">
                                    <div className="h-4 w-4 rounded-full bg-slate-100 skeleton-shimmer" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>

                        <section className="md:hidden py-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="h-6 w-36 rounded-full bg-slate-100 skeleton-shimmer" />
                          </div>
                          <div className="mt-4 divide-y divide-slate-100">
                            <SignedHistorySkeletonRow />
                            <SignedHistorySkeletonRow />
                            <SignedHistorySkeletonRow />
                            <SignedHistorySkeletonRow />
                          </div>
                        </section>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
