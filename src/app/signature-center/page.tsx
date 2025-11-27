import Link from "next/link";
import { FileSignature } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import SignatureRequestsTable from "./SignatureRequestsTable";

export default async function SignatureCenterPage() {
  const session = await getServerSession(authOptions);
  const displayName = session?.user?.name ?? session?.user?.email ?? "Guest";
  const shortName = displayName.split(" ")[0] ?? "Guest";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4E9FF] via-[#EEF4FF] to-white text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
              <FileSignature className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                Welcome back, {shortName}.
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Mergify Sign — Signature Requests
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Track your pending and completed signature requests in one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Return to Dashboard
            </Link>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-[#7D4CDB] px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#6B3DBD]"
            >
              Send Signature Request
            </button>
          </div>
        </header>

        <main className="rounded-[24px] border border-slate-200 bg-[#FBFAFF] p-9 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                  Start a new signature request
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Upload a document, choose your signers, and send for signature in a few clicks.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-[#7D4CDB] px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#6B3DBD]"
              >
                Start a New Request
              </button>
            </div>
          </section>

          <SignatureRequestsTable />
        </main>
      </div>
    </div>
  );
}
