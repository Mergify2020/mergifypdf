export default function Loading() {
  return (
    <main className="flex h-screen w-full items-center justify-center bg-[#F1F4F9] dark:bg-[#222224]">
      <div
        aria-label="Loading"
        className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-zinc-700 dark:border-t-zinc-200"
      />
    </main>
  );
}
