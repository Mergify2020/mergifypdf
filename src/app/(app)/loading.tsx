export default function AppLoading() {
  return (
    <main className="flex min-h-[calc(100dvh-1px)] flex-1 items-center justify-center bg-[#f7f8fc] dark:bg-[#252525]">
      <div className="flex flex-col items-center gap-3" aria-label="Loading workspace" role="status">
        <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-base font-bold text-white shadow-sm">
          M
        </div>
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <span className="block h-full w-1/2 animate-[pulse_900ms_ease-in-out_infinite] rounded-full bg-violet-500" />
        </span>
        <span className="sr-only">Loading workspace</span>
      </div>
    </main>
  );
}
