type ViewMode = "grid" | "list";

function SkeletonBlock({ className }: { className: string }) {
  return <span className={`block skeleton-shimmer bg-slate-200/80 dark:bg-white/10 ${className}`} />;
}

function QuickActionSkeleton({ index }: { index: number }) {
  const titleWidths = ["w-24", "w-20", "w-28", "w-24", "w-32", "w-24"];
  const descriptionWidths = ["w-48", "w-44", "w-52", "w-48", "w-44", "w-48"];

  return (
    <div className="flex min-h-[92px] w-full max-w-[280px] shrink-0 snap-start flex-none flex-col items-start gap-1.5 overflow-hidden rounded-[10px] border-2 border-[#D7DDE5] bg-[#F3F5F8] p-2.5 shadow-[0_1px_0_rgba(15,23,42,0.015),0_6px_14px_rgba(15,23,42,0.035)] dark:border-[#3F3F3F] dark:bg-[#2B2B2B] dark:shadow-[0_6px_14px_rgba(0,0,0,0.18)] sm:min-w-[250px] sm:max-w-[300px] lg:min-w-[260px] lg:max-w-[320px]">
      <SkeletonBlock className="h-9 w-9 rounded-2xl" />
      <SkeletonBlock className={`h-3.5 rounded-md ${titleWidths[index] ?? "w-24"}`} />
      <SkeletonBlock className={`h-3 rounded-md ${descriptionWidths[index] ?? "w-48"}`} />
      <SkeletonBlock className="h-3 w-16 rounded-md" />
    </div>
  );
}

function ProjectsToolbarSkeleton() {
  return (
    <div className="shrink-0 border-b border-[#E6EBF2] bg-white dark:border-[#3F3F3F] dark:bg-[#252525]">
      <div className="flex flex-col gap-2.5 py-2.5 lg:flex-row lg:items-center lg:justify-between">
        <SkeletonBlock className="h-6 w-32 rounded-md sm:h-7" />
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:justify-end">
          <div className="flex h-10 min-w-0 w-full flex-[0_1_440px] items-center gap-2 rounded-xl border border-[#E6EBF2] bg-white px-3 shadow-sm dark:border-[#3F3F3F] dark:bg-[#323232] lg:max-w-[440px]">
            <SkeletonBlock className="h-4 w-4 shrink-0 rounded-full" />
            <SkeletonBlock className="h-3.5 w-[min(70%,220px)] rounded-md" />
          </div>
          <div className="hidden shrink-0 items-center rounded-xl border border-[#E6EBF2] bg-white p-1 shadow-sm min-[520px]:inline-flex dark:border-[#3F3F3F] dark:bg-[#323232]">
            <SkeletonBlock className="h-8 w-[68px] rounded-lg" />
            <span className="h-8 w-[68px]" />
          </div>
          <SkeletonBlock className="hidden h-10 w-[128px] shrink-0 rounded-xl sm:block" />
          <SkeletonBlock className="h-10 w-11 shrink-0 rounded-xl sm:w-[118px]" />
        </div>
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="recent-projects-grid projects-grid mt-4 grid w-full min-w-0 items-start gap-4 sm:gap-5 xl:gap-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={`project-grid-skeleton-${index}`} className="min-w-0">
          <div className="rounded-[10px] bg-[#F9FAFC] p-[3px] dark:bg-[#323232]/60">
            <div className="relative aspect-square overflow-hidden rounded-[8px] border border-black/[0.06] bg-[#EEF1F5] dark:border-white/[0.06] dark:bg-[#2B2B2B]">
              <SkeletonBlock className="absolute inset-0 rounded-[8px]" />
              <span className="absolute left-3 top-3 h-5 w-5 rounded-[5px] border-2 border-slate-300/70 dark:border-white/10" />
              <SkeletonBlock className="absolute bottom-3 right-3 h-8 w-8 rounded-lg" />
            </div>
          </div>
          <div className="mt-2.5 space-y-2 px-0.5">
            <SkeletonBlock className={`h-3.5 rounded-md ${index % 3 === 0 ? "w-2/3" : "w-3/4"}`} />
            <SkeletonBlock className={`h-3 rounded-md ${index % 2 === 0 ? "w-2/5" : "w-1/2"}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListRowSkeleton({ index }: { index: number }) {
  return (
    <div className="grid grid-cols-[36px_20px_minmax(280px,1fr)_120px_96px_56px] items-center gap-x-3 px-4 py-3 xl:grid-cols-[36px_20px_minmax(420px,1fr)_180px_120px_72px] xl:gap-x-5 2xl:grid-cols-[36px_20px_minmax(560px,1fr)_208px_132px_84px] 2xl:gap-x-6">
      <span className="h-5 w-5 rounded-[5px] border-2 border-slate-300/70 dark:border-white/10" />
      <SkeletonBlock className="h-[18px] w-[18px] rounded-full" />
      <div className="min-w-0 space-y-1.5">
        <SkeletonBlock className={`h-4 rounded-md ${index % 3 === 0 ? "w-44" : index % 3 === 1 ? "w-56" : "w-36"}`} />
        <SkeletonBlock className={`h-3 rounded-md ${index % 2 === 0 ? "w-24" : "w-32"}`} />
      </div>
      <SkeletonBlock className="h-3.5 w-24 rounded-md" />
      <SkeletonBlock className="mx-auto h-3.5 w-14 rounded-md" />
      <SkeletonBlock className="ml-auto h-8 w-8 rounded-lg" />
    </div>
  );
}

function MobileListRowSkeleton({ index }: { index: number }) {
  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)_40px] items-start gap-x-4 px-4 py-3">
      <span className="mt-1 h-5 w-5 rounded-[5px] border-2 border-slate-300/70 dark:border-white/10" />
      <div className="min-w-0 space-y-2">
        <SkeletonBlock className={`h-4 rounded-md ${index % 2 === 0 ? "w-3/4" : "w-2/3"}`} />
        <SkeletonBlock className="h-3 w-1/2 rounded-md" />
      </div>
      <SkeletonBlock className="h-8 w-8 rounded-lg" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <div className="grid grid-cols-[36px_minmax(0,1fr)_40px] items-center gap-x-4 border-b border-[#E6EBF2] bg-white px-4 py-3 dark:border-[#3C3C3C] dark:bg-[#323232]">
          <span className="h-5 w-5 rounded-[5px] border-2 border-slate-300/70 dark:border-white/10" />
          <SkeletonBlock className="h-3.5 w-14 rounded-md" />
          <span />
        </div>
        <div className="divide-y divide-[#E6EBF2] dark:divide-[#3C3C3C]">
          {Array.from({ length: 7 }).map((_, index) => <MobileListRowSkeleton key={index} index={index} />)}
        </div>
      </div>
      <div className="hidden min-h-0 flex-1 flex-col md:flex">
        <div className="grid grid-cols-[36px_20px_minmax(280px,1fr)_120px_96px_56px] items-center gap-x-3 border-b border-[#E6EBF2] bg-white px-4 py-3 dark:border-[#3C3C3C] dark:bg-[#323232] xl:grid-cols-[36px_20px_minmax(420px,1fr)_180px_120px_72px] xl:gap-x-5 2xl:grid-cols-[36px_20px_minmax(560px,1fr)_208px_132px_84px] 2xl:gap-x-6">
          <span className="h-5 w-5 rounded-[5px] border-2 border-slate-300/70 dark:border-white/10" />
          <span />
          <SkeletonBlock className="h-3.5 w-16 rounded-md" />
          <SkeletonBlock className="h-3.5 w-16 rounded-md" />
          <SkeletonBlock className="mx-auto h-3.5 w-12 rounded-md" />
          <SkeletonBlock className="ml-auto h-3.5 w-12 rounded-md" />
        </div>
        <div className="divide-y divide-[#E6EBF2] dark:divide-[#3C3C3C]">
          {Array.from({ length: 8 }).map((_, index) => <ListRowSkeleton key={index} index={index} />)}
        </div>
      </div>
    </div>
  );
}

export default function AllProjectsSkeleton({ viewMode = "list" }: { viewMode?: ViewMode }) {
  return (
    <section
      className="flex min-h-0 w-full flex-1 flex-col"
      aria-label="Loading projects"
      aria-busy="true"
      role="status"
    >
      <span className="sr-only">Loading your projects</span>
      <div className="flex h-full min-h-0 w-full flex-1 flex-col px-4 pt-2 sm:px-5 sm:pt-3 lg:px-7 xl:px-8">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="relative shrink-0">
            <div className="flex snap-x snap-mandatory gap-3 overflow-hidden pb-2 pl-1 pr-12 md:pr-16">
              {Array.from({ length: 6 }).map((_, index) => <QuickActionSkeleton key={index} index={index} />)}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ProjectsToolbarSkeleton />
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
              {viewMode === "grid" ? <GridSkeleton /> : <ListSkeleton />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
