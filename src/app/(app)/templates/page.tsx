import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import { LayoutGrid, List } from "lucide-react";
import TemplatesHeader from "@/components/TemplatesHeader";

export default async function TemplatesPage() {
  const session = await getServerSessionSafe();

  if (!session?.user) {
    redirect("/login");
  }

  const googleManagedAccount =
    !!session.user.providers?.includes("google") && !session.user.providers.includes("credentials");
  if (!googleManagedAccount && session.user.twoFactorEnabled && !session.user.twoFactorPassed) {
    redirect("/2fa");
  }

  const displayName = session.user.name ?? session.user.email ?? "Guest";
  const email = session.user.email ?? null;

  return (
    <main className="h-screen w-full bg-[#F1F4F9] py-6 dark:bg-[#222224]">
      <div className="w-full">
        <div className="flex h-full w-full max-w-[1680px] min-h-0 flex-col px-1">
          <TemplatesHeader
            accountName={displayName}
            accountEmail={email}
            leftSlot={
              <div className="flex w-full max-w-md items-center gap-4">
                <div className="flex w-full">
                  <div className="flex h-12 w-full cursor-text rounded-full border-2 border-[#E5E7EB] bg-transparent p-[1px] shadow-[12px_0_36px_rgba(15,23,42,0.10)] transition duration-200 ease-out focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[rgba(37,99,235,0.18)] dark:border-zinc-700 dark:bg-zinc-900/60 dark:shadow-[12px_0_36px_rgba(0,0,0,0.45)] dark:focus-within:border-[#2563EB]">
                    <div className="flex h-full w-full items-center gap-2 rounded-full bg-white px-4 text-[#1F2A37] dark:bg-zinc-900 dark:text-zinc-100">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search templates..."
                        className="h-full min-w-0 flex-1 border-none bg-white text-sm text-[#1F2A37] placeholder:text-[#6B7280] outline-none focus:outline-none focus:ring-0 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                      />
                    </div>
                  </div>
                </div>
                <div className="inline-flex items-center rounded-full border-2 border-[#E6EBF2] bg-white p-1 text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-sm transition duration-200 ease-out"
                    aria-pressed="true"
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition duration-200 ease-out hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                    aria-pressed="false"
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            }
          />
          <div className="mt-6 flex w-full">
            <div className="w-full max-w-[680px]">
              <div className="flex min-h-[120px] items-center justify-between gap-6 rounded-2xl border border-[#E5E7EB] bg-gradient-to-br from-white via-[#F8FAFF] to-[#EEF3FF] px-7 py-7 shadow-[0_16px_36px_rgba(15,23,42,0.12)] transition duration-200 ease-out dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800 dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)] sm:px-8 sm:py-8">
                <div className="flex min-w-0 flex-col">
                  <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                    Welcome to Templates
                  </p>
                  <p className="mt-1 text-sm font-normal text-slate-500 dark:text-zinc-400">
                    Choose a template or import your own to get started.
                  </p>
                </div>
                <div className="hidden h-16 w-28 items-center justify-center text-slate-400 dark:text-zinc-500 sm:flex">
                  <svg
                    viewBox="0 0 160 100"
                    className="h-full w-full"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="120" cy="28" r="14" />
                    <path d="M104 86v-8c0-12 8-20 20-20s20 8 20 20v8" />
                    <path d="M20 62h36" />
                    <path d="M18 76h44" />
                    <rect x="12" y="20" width="60" height="30" rx="6" />
                    <path d="M18 30h18" />
                    <path d="M18 38h26" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="templates-grid mt-6 grid w-full auto-rows-max grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <button
                key={`template-skeleton-${index}`}
                type="button"
                className="group flex h-auto cursor-pointer flex-col self-start rounded-[10px] bg-[#F9FAFC] text-left shadow-[0_8px_18px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-black/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(15,23,42,0.12)] dark:bg-zinc-900 dark:ring-white/10 dark:hover:shadow-[0_16px_30px_rgba(0,0,0,0.4)]"
              >
                <div className="flex flex-1 items-center justify-center px-3 pt-3">
                  <div className="relative aspect-square w-full rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-[#EEF1F5] dark:border-transparent dark:bg-zinc-800/70">
                    <div className="absolute inset-0 rounded-[10px] templates-skeleton opacity-70" />
                  </div>
                </div>
                <div className="px-3 pb-4 pt-3">
                  <div className="h-5 w-2/3 rounded-full bg-slate-200/70 dark:bg-zinc-700/60" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
