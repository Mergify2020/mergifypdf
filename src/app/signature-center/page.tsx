import Link from "next/link";

export default function SignatureCenterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f4f7fb] to-white text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Signature Center</h1>
            <p className="mt-2 text-sm text-slate-600">
              A dedicated space for sending documents for signature, tracking status, and managing signed agreements.
            </p>
          </div>
          <Link
            href="/studio"
            className="inline-flex items-center justify-center rounded-full bg-[#024d7c] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:-translate-y-0.5"
          >
            Back to workspace
          </Link>
        </header>

        <main className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-[0_35px_90px_rgba(15,23,42,0.08)]">
          <p className="text-sm text-slate-600">
            We&apos;ll build out full send‑for‑signature workflows here soon. For now, this page is a simple starting
            point where we can add queues, templates, and status tracking for your signature requests.
          </p>
        </main>
      </div>
    </div>
  );
}

