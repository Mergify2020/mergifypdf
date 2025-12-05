export default function PageLoadingSkeleton() {
  return (
    <div className="w-full flex-1 animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div className="h-6 w-32 rounded-full bg-slate-100 skeleton-shimmer" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
            <div className="h-9 w-9 rounded-full bg-slate-100 skeleton-shimmer" />
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-[1.3fr,1fr]">
          <div className="space-y-4">
            <div className="h-7 w-3/4 rounded-full bg-slate-100 skeleton-shimmer" />
            <div className="h-7 w-2/3 rounded-full bg-slate-100 skeleton-shimmer" />
            <div className="h-4 w-full rounded-full bg-slate-100 skeleton-shimmer" />
            <div className="h-4 w-5/6 rounded-full bg-slate-100 skeleton-shimmer" />
            <div className="mt-2 flex gap-3">
              <div className="h-10 w-32 rounded-full bg-slate-100 skeleton-shimmer" />
              <div className="h-10 w-28 rounded-full bg-slate-100 skeleton-shimmer" />
            </div>
          </div>
          <div className="h-44 rounded-2xl bg-slate-100 skeleton-shimmer" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={item}
              className="h-28 rounded-2xl bg-slate-50 skeleton-shimmer"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
