import Link from "next/link";
import { FileSignature } from "lucide-react";
import SignatureRequestsTable from "./SignatureRequestsTable";

export default function SignatureCenterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f4f7fb] to-white text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
              <FileSignature className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Mergify Sign — Signature Requests
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Track your pending, sent, and completed signature requests in one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/studio"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Return to Dashboard
            </Link>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-[#6A4EE8] px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#5C3EDB]"
            >
              Send Signature Request
            </button>
          </div>
        </header>

        <main className="rounded-[24px] border border-slate-200 bg-[#FBFAFF] p-9 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
          <SignatureRequestsTable />
        </main>
      </div>
    </div>
  );
}
