import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, FileSignature, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

const MOCK_REQUEST = {
  id: "1",
  documentName: "Vendor Renewal Agreement",
  projectName: "Pinnacol Renewal 2025",
  completed: false,
  signers: [
    { name: "Leticia Silva", email: "leticia@mergifypdf.com", hasSigned: true },
    { name: "Pinnacol Ops", email: "operations@pinnacolassurance.com", hasSigned: false },
    { name: "Legal Reviewer", email: "legal@pinnacolassurance.com", hasSigned: false },
  ],
  auditLog: [
    { label: "Created", at: "Today • 3:12 PM" },
    { label: "Request sent", at: "Today • 3:14 PM" },
    { label: "Signer completed", at: "Today • 3:40 PM" },
  ],
};

export default async function SignatureRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = id === MOCK_REQUEST.id ? MOCK_REQUEST : null;

  if (!request) {
    notFound();
  }

  const totalSigners = request.signers.length;
  const signedCount = request.signers.filter((signer) => signer.hasSigned).length;
  const isCompleted = request.completed || signedCount === totalSigners;
  const progress = totalSigners === 0 ? 0 : signedCount / totalSigners;

  return (
    <div className="box-border min-h-screen w-full bg-[#F1F4F9] px-3 pb-10 pt-3 text-slate-900 md:px-6 md:pt-6">
      <div className="h-full min-h-0 w-full">
        <div className="relative z-40 flex h-full min-h-0 w-full flex-col rounded-xl border-[1.5px] border-gray-200 bg-white p-3 shadow-sm md:p-5">
          <section className="page-fade-in rounded-[28px] border border-white/70 bg-[#5b5481] px-4 py-4 text-white shadow-[0_22px_60px_rgba(44,38,83,0.18)] backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                  Signature request
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/85">
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" aria-hidden />
                  ) : (
                    <Clock3 className="h-3.5 w-3.5 text-white/75" aria-hidden />
                  )}
                  {isCompleted ? "Completed" : `Pending signatures (${signedCount}/${totalSigners})`}
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {request.documentName}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/78 sm:text-[15px]">
                {request.projectName
                  ? `Project: ${request.projectName}`
                  : "Manage the request, signers, and final downloads from here."}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white px-4 text-sm font-semibold text-[#342a6d] shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition hover:-translate-y-[1px] hover:bg-[#faf8ff]"
              >
                Resend request
              </button>
              <Link
                href="#downloads"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/8 px-4 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/14"
              >
                <ArrowUpRight className="h-4 w-4" aria-hidden />
                Jump to downloads
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                Progress
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {signedCount}/{totalSigners}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-white/12">
                <div
                  className="h-full rounded-full bg-[#9B8CFF]"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                Signers
              </p>
              <p className="mt-2 text-2xl font-semibold">{totalSigners}</p>
              <p className="mt-1 text-sm text-white/78">Tracked participants in this request</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                Final package
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white/90">
                <ShieldCheck className="h-4 w-4 text-emerald-200" aria-hidden />
                Audit trail ready
              </div>
            </div>
          </div>
          </section>

          <main className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
            <section className="page-fade-in space-y-6" style={{ animationDelay: "40ms" }}>
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                    Signers
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    Everyone who needs to sign
                  </h2>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  {signedCount} complete
                </span>
              </div>

              <ul className="mt-5 space-y-3">
                {request.signers.map((signer) => {
                  const signed = signer.hasSigned;
                  return (
                    <li
                      key={signer.email}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            signed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {signed ? (
                            <CheckCircle2 className="h-5 w-5" aria-hidden />
                          ) : (
                            <Clock3 className="h-5 w-5" aria-hidden />
                          )}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">{signer.name}</p>
                          <p className="text-sm text-slate-500">{signer.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            signed
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {signed ? "Signed" : "Pending"}
                        </span>
                        {!signed ? (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Send reminder
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                    Audit log
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    Request activity
                  </h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <FileSignature className="h-5 w-5" aria-hidden />
                </div>
              </div>

              <ul className="mt-5 space-y-2">
                {request.auditLog.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700"
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-slate-500">{item.at}</span>
                  </li>
                ))}
                {isCompleted ? (
                  <li className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <span>Final signed PDF generated</span>
                    <span className="text-xs text-emerald-700">Today • 3:52 PM</span>
                  </li>
                ) : null}
              </ul>
            </div>
            </section>

            <aside className="page-fade-in space-y-6" style={{ animationDelay: "80ms" }}>
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                    Document preview
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    First page snapshot
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  Protected
                </span>
              </div>
              <div className="mt-5 flex h-56 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                Document preview placeholder
              </div>
              <button
                type="button"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open full document
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div
              id="downloads"
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                    Downloads
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    Final files
                  </h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-100"
                >
                  <span>Final signed PDF</span>
                  <span className="text-xs text-slate-500">Download</span>
                </button>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-100"
                >
                  <span>Certificate of Completion</span>
                  <span className="text-xs text-slate-500">Download</span>
                </button>
              </div>
              </div>
            </aside>
          </main>
        </div>
      </div>
    </div>
  );
}
