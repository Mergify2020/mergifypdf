import Link from "next/link";
import { FileSignature } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import SignatureRequestsTable from "./SignatureRequestsTable";
import SignatureTemplates from "./SignatureTemplates";

export default async function SignatureCenterPage() {
  const session = await getServerSession(authOptions);
  const displayName = session?.user?.name ?? session?.user?.email ?? "Guest";
  const shortName = displayName.split(" ")[0] ?? "Guest";

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-6 py-8">
        <section className="rounded-[10px] border border-slate-200 bg-white p-6 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#E5EDFF] text-[#1D4ED8]">
                <FileSignature className="h-4 w-4" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">
                  Welcome back, {shortName}.
                </p>
                <h1 className="text-[22px] font-semibold text-[#111827] sm:text-[26px]">
                  Mergify Sign — Signature Requests
                </h1>
                <p className="text-sm text-slate-500">
                  See what needs your attention, track pending signatures, and download completed documents.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-[8px] border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Back to Workspace
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-[8px] bg-[#6A4EE8] px-5 py-2 text-sm font-semibold text-white shadow-[0_3px_10px_rgba(15,23,42,0.18)] transition-colors hover:bg-[#5C3EDB]"
              >
                Send Signature Request
              </button>
            </div>
          </header>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-full border border-slate-200 bg-[#F9FAFB] px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Requests remaining
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">8 of 10 left</p>
                <p className="text-xs text-slate-500">Resets monthly</p>
              </div>
              <button
                type="button"
                className="ml-4 whitespace-nowrap rounded-full bg-[#6A4EE8] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#5C3EDB]"
              >
                Get More Requests
              </button>
            </div>
            <div className="flex items-center justify-between rounded-full border border-slate-200 bg-[#F9FAFB] px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Pending signatures
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">2</p>
                <p className="text-xs text-slate-500">Waiting on others</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-full border border-slate-200 bg-[#F9FAFB] px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Waiting for you
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">1</p>
                <p className="text-xs text-slate-500">You need to sign</p>
              </div>
            </div>
          </div>
        </section>

        <main className="rounded-[10px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <section className="mb-5 rounded-[8px] border border-slate-200 bg-[#F9FAFB] p-4">
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
                className="inline-flex items-center justify-center rounded-[999px] border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Start a New Request
              </button>
            </div>
          </section>

          <SignatureTemplates />

          <SignatureRequestsTable />
        </main>
      </div>
    </div>
  );
}
