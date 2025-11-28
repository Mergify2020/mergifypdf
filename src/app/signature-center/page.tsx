import Link from "next/link";
import { Activity, Clock, UserCheck } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import SignatureRequestsTable from "./SignatureRequestsTable";

export default async function SignatureCenterPage() {
  const session = await getServerSession(authOptions);
  const displayName = session?.user?.name ?? session?.user?.email ?? "Guest";
  const shortName = displayName.split(" ")[0] ?? "Guest";

  const requestsRemaining = 8;
  const requestLimit = 10;
  const pendingCount = 2;
  const waitingForYouCount = 1;

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-6 py-8">
        <header className="mb-6 flex justify-between">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Back to Workspace
          </Link>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                  <Activity className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Requests Remaining
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {requestsRemaining} of {requestLimit} left
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Resets monthly</p>
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#6A4EE8]"
                style={{ width: `${Math.max(0, Math.min(1, requestsRemaining / requestLimit)) * 100}%` }}
              />
            </div>
            {requestsRemaining <= 0 ? (
              <button
                type="button"
                className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-[#6A4EE8] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#5C3EDB]"
              >
                Get More Requests
              </button>
            ) : null}
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                <Clock className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Pending Signatures
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{pendingCount}</p>
                <p className="mt-1 text-xs text-slate-500">Waiting on others</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                <UserCheck className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Waiting for You
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{waitingForYouCount}</p>
                <p className="mt-1 text-xs text-slate-500">You need to sign</p>
              </div>
            </div>
          </div>
        </section>

        <main className="space-y-6">
          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Start a New Request</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Upload a document, choose your signers, and send for signature in a few clicks.
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center justify-center rounded-md bg-[#6A4EE8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5C3EDB]"
                >
                  Start a New Request
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="hidden md:block" />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Templates
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    Manage templates
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  <article className="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs">
                    <h3 className="text-sm font-semibold text-slate-900">Mutual NDA</h3>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Standard two-party NDA for vendor or client onboarding.
                    </p>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Use template
                    </button>
                  </article>
                  <article className="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs">
                    <h3 className="text-sm font-semibold text-slate-900">Master Services Agreement</h3>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Baseline terms you can reuse across projects and clients.
                    </p>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Use template
                    </button>
                  </article>
                  <article className="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs">
                    <h3 className="text-sm font-semibold text-slate-900">Statement of Work</h3>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Scope, timelines, and deliverables for a single engagement.
                    </p>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Use template
                    </button>
                  </article>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <SignatureRequestsTable />
          </section>
        </main>
      </div>
    </div>
  );
}
