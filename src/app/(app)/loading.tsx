export default function Loading() {
  return (
    <main className="h-screen w-full bg-[#F1F4F9] py-6 dark:bg-[#222224]">
      <div className="w-full">
        <div className="grid h-full w-full max-w-[1680px] min-h-0 gap-[24px] lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="relative z-40 flex h-full min-h-0 w-full flex-col px-1 pb-10 pt-0">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-6">
                <div className="h-6 w-40 rounded-full skeleton-shimmer" />
                <div className="flex w-full max-w-sm">
                  <div className="h-11 w-full rounded-full skeleton-shimmer" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-11 w-11 rounded-full skeleton-shimmer" />
                <div className="h-11 w-44 rounded-full skeleton-shimmer" />
              </div>
            </div>

            <div className="mt-6 flex min-h-0 flex-col rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="h-5 w-36 rounded-full skeleton-shimmer" />
                <div className="flex items-center gap-2">
                  <div className="h-8 w-28 rounded-full skeleton-shimmer" />
                  <div className="h-8 w-24 rounded-full skeleton-shimmer" />
                </div>
              </div>
              <div className="mt-4 grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="space-y-3">
                    <div className="aspect-square w-full rounded-xl skeleton-shimmer" />
                    <div className="h-4 w-3/5 rounded-full skeleton-shimmer" />
                    <div className="h-3 w-2/5 rounded-full skeleton-shimmer" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside
            className="relative z-10 flex w-full flex-col min-h-0"
            style={{
              marginTop: "var(--home-right-column-offset, 240px)",
              height: "calc(100vh - var(--home-right-column-offset, 240px) - 48px)",
              gap: "var(--home-section-gap, 24px)",
            }}
          >
            <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
              <div className="h-3 w-24 rounded-full skeleton-shimmer" />
              <div className="mt-4 space-y-3">
                <div className="h-4 w-40 rounded-full skeleton-shimmer" />
                <div className="h-4 w-36 rounded-full skeleton-shimmer" />
                <div className="h-4 w-32 rounded-full skeleton-shimmer" />
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
              <div className="h-3 w-20 rounded-full skeleton-shimmer" />
              <div className="mt-4 h-24 rounded-xl skeleton-shimmer" />
            </div>

            <div className="flex flex-1 min-h-0 flex-col gap-[24px]">
              <div className="flex flex-[1] min-h-0 flex-col rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
                <div className="h-3 w-24 rounded-full skeleton-shimmer" />
                <div className="mt-4 flex flex-1 items-center justify-center rounded-xl skeleton-shimmer" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
