export default function Loading() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#F9FAFC] dark:bg-[#222224]">
      <div
        aria-label="Loading"
        className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-zinc-700 dark:border-t-zinc-200"
      />
    </main>
  );
}
