import { notFound } from "next/navigation";

type PageProps = {
  params: { id: string };
};

const MOCK_REQUEST = {
  id: "1",
  documentName: "Vendor Renewal Agreement",
  projectName: "Pinnacol Renewal 2025",
  status: "Pending signatures (1/3)",
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

export default function SignatureRequestDetailPage({ params }: PageProps) {
  // In a future phase, replace with real data fetching.
  const request = params.id === MOCK_REQUEST.id ? MOCK_REQUEST : null;

  if (!request) {
    notFound();
  }

  const totalSigners = request.signers.length;
  const signedCount = request.signers.filter((signer) => signer.hasSigned).length;
  const isCompleted = request.completed || signedCount === totalSigners;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4E9FF] via-[#EEF4FF] to-white text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
              Signature request
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {request.documentName}
            </h1>
            {request.projectName ? (
              <p className="mt-1 text-sm text-slate-600">
                Project: {request.projectName}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={
                isCompleted
                  ? "inline-flex items-center rounded-full border border-[#A7F3D0] bg-[#ECFDF3] px-3 py-1 text-xs font-medium text-[#166534]"
                  : "inline-flex items-center rounded-full border border-[#C7B9FF] bg-[#F5F3FF] px-3 py-1 text-xs font-medium text-[#6A4EE8]"
              }
            >
              {isCompleted ? "Completed" : `Pending signatures (${signedCount}/${totalSigners})`}
            </span>
          </div>
        </header>

        <main className="space-y-6">
          <section className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-[#7D4CDB] px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#6B3DBD]"
            >
              Resend Request
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Cancel Request
            </button>
          </section>

          <section className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* Signers */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                Signers
              </h2>
              <ul className="space-y-3 text-sm">
                {request.signers.map((signer) => {
                  const dotClass = signer.hasSigned ? "bg-[#22C55E]" : "bg-slate-300";
                  return (
                    <li key={signer.email} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                        <div>
                          <p className="font-medium text-slate-900">{signer.name}</p>
                          <p className="text-xs text-slate-500">{signer.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-700">
                          {signer.hasSigned ? "Completed" : "Pending"}
                        </span>
                        {!signer.hasSigned ? (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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

            {/* Document preview */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                Document preview
              </h2>
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
                First page thumbnail placeholder
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open full document
              </button>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {/* Audit log */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                Audit log
              </h2>
              <ul className="space-y-2 text-sm text-slate-700">
                {request.auditLog.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-3">
                    <span>{item.label}</span>
                    <span className="text-xs text-slate-500">{item.at}</span>
                  </li>
                ))}
                {isCompleted ? (
                  <li className="flex items-center justify-between gap-3">
                    <span>Final signed PDF generated</span>
                    <span className="text-xs text-slate-500">Today • 3:52 PM</span>
                  </li>
                ) : null}
              </ul>
            </div>

            {/* Downloads */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                Downloads
              </h2>
              <div className="space-y-3 text-sm">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-left font-medium text-slate-800 hover:bg-slate-100"
                >
                  <span>Final signed PDF</span>
                  <span className="text-xs text-slate-500">Download</span>
                </button>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-left font-medium text-slate-800 hover:bg-slate-100"
                >
                  <span>Certificate of Completion</span>
                  <span className="text-xs text-slate-500">Download</span>
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

