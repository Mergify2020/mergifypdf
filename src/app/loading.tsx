export default function Loading() {
  // Global loading skeleton shown while any page segment is loading.
  return (
    <div className="fixed inset-0 z-[1000] bg-white">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-8 px-6 py-8">
        {/* Top navigation skeleton */}
        <div className="flex items-center justify-between gap-4">
          <div className="h-7 w-32 rounded-full bg-slate-100 skeleton-shimmer" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
            <div className="h-9 w-9 rounded-full bg-slate-100 skeleton-shimmer" />
          </div>
        </div>

        {/* Hero / header skeleton */}
        <div className="grid gap-8 md:grid-cols-[1.3fr,1fr]">
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded-full bg-slate-100 skeleton-shimmer" />
            <div className="h-8 w-2/3 rounded-full bg-slate-100 skeleton-shimmer" />
            <div className="h-5 w-full rounded-full bg-slate-100 skeleton-shimmer" />
            <div className="h-5 w-5/6 rounded-full bg-slate-100 skeleton-shimmer" />
            <div className="mt-2 flex gap-3">
              <div className="h-11 w-36 rounded-full bg-slate-100 skeleton-shimmer" />
              <div className="h-11 w-32 rounded-full bg-slate-100 skeleton-shimmer" />
            </div>
          </div>
          <div className="h-48 rounded-2xl bg-slate-100 skeleton-shimmer" />
        </div>

        {/* Content section skeletons */}
        <div className="space-y-4">
          {[0, 1, 2].map((index) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className="h-24 rounded-2xl bg-slate-50 skeleton-shimmer"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
