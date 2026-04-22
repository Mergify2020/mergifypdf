"use client";

import { useState } from "react";
import { ArrowRight, Ban, CheckCircle2, FileSignature, Info } from "lucide-react";
import { useVisibleSignatureRows } from "./useVisibleSignatureRows";

type Signer = {
  name: string;
  email: string;
  hasSigned: boolean;
};

type SignatureRequest = {
  id: string;
  documentName: string;
  projectName?: string;
  primaryRecipientName: string;
  primaryRecipientEmail: string;
  signers: Signer[];
  sentAt: string;
  state?: "pending" | "completed" | "voided";
  attention?: "you" | "others";
};

const INITIAL_REQUESTS: SignatureRequest[] = [
  {
    id: "1",
    documentName: "Vendor Renewal Agreement",
    projectName: "Pinnacol Renewal 2025",
    primaryRecipientName: "Pinnacol Ops Team",
    primaryRecipientEmail: "operations@pinnacolassurance.com",
    signers: [
      { name: "Alan Morris", email: "alan@mergifypdf.com", hasSigned: false },
      { name: "Pinnacol Ops", email: "operations@pinnacolassurance.com", hasSigned: true },
      { name: "Legal Reviewer", email: "legal@pinnacolassurance.com", hasSigned: false },
    ],
    sentAt: "2026-04-20T22:14:09Z",
    state: "pending",
    attention: "others",
  },
  {
    id: "2",
    documentName: "Client Audit Packet",
    projectName: "Golden Rain FY25",
    primaryRecipientName: "Golden Rain Finance",
    primaryRecipientEmail: "finance@goldenrainmasonry.com",
    signers: [
      { name: "Finance Lead", email: "finance@goldenrainmasonry.com", hasSigned: true },
      { name: "Owner Signer", email: "owner@goldenrainmasonry.com", hasSigned: true },
      { name: "Auditor", email: "audit@goldenrainmasonry.com", hasSigned: false },
    ],
    sentAt: "2026-04-19T15:24:00Z",
    state: "voided",
  },
  {
    id: "3",
    documentName: "Compliance Addendum",
    projectName: "MergifyPDF Studio",
    primaryRecipientName: "MergifyPDF Legal",
    primaryRecipientEmail: "legal@mergifypdf.com",
    signers: [
      { name: "Head of Legal", email: "legal@mergifypdf.com", hasSigned: true },
      { name: "Operations", email: "ops@mergifypdf.com", hasSigned: true },
    ],
    sentAt: "2026-04-18T16:41:00Z",
    state: "completed",
  },
  {
    id: "4",
    documentName: "Project T – SOW",
    projectName: "Project T",
    primaryRecipientName: "Northbridge Projects",
    primaryRecipientEmail: "projects@northbridgepartners.co",
    signers: [
      { name: "Account Lead", email: "projects@northbridgepartners.co", hasSigned: true },
      { name: "Client Sponsor", email: "sponsor@northbridgepartners.co", hasSigned: true },
    ],
    sentAt: "2026-04-17T19:18:00Z",
    state: "completed",
  },
];

export default function SignatureRequestsTable() {
  const requests = INITIAL_REQUESTS;
  const [activeRequest, setActiveRequest] = useState<SignatureRequest | null>(null);
  const [openSignerOrderRequestId, setOpenSignerOrderRequestId] = useState<string | null>(null);
  const visibleRequestCount = useVisibleSignatureRows();
  function getRequestProgress(request: SignatureRequest) {
    const totalSigners = request.signers.length;
    const signedCount = request.signers.filter((signer) => signer.hasSigned).length;
    const isVoided = request.state === "voided";
    const isCompleted = !isVoided && totalSigners > 0 && signedCount === totalSigners;
    const isPending = !isVoided && !isCompleted;
    const nextSigner = request.signers.find((signer) => !signer.hasSigned) ?? null;

    return { totalSigners, signedCount, isCompleted, isPending, isVoided, nextSigner };
  }

  function toggleSignerOrder(requestId: string) {
    setOpenSignerOrderRequestId((current) => (current === requestId ? null : requestId));
  }

  function formatSentOn(sentAt: string) {
    const date = new Date(sentAt);
    if (Number.isNaN(date.getTime())) return "";

    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return dateFormatter.format(date);
  }

  function renderSentOn(request: SignatureRequest) {
    const { isVoided } = getRequestProgress(request);
    const formattedSentOn = formatSentOn(request.sentAt);
    const label = isVoided ? "Voided on" : "Sent on";

    return (
      <div className="min-w-0 text-[13px] font-medium leading-tight">
        <div className={`leading-none ${isVoided ? "text-rose-600" : "text-slate-500"}`}>
          <span className="whitespace-nowrap">{label}</span>
        </div>
        <div className={`mt-0.5 leading-none ${isVoided ? "text-rose-600" : "text-slate-500"}`}>
          <span className="whitespace-nowrap">{formattedSentOn}</span>
        </div>
      </div>
    );
  }

  const visibleRequests = requests ?? [];
  const requestsToShow = visibleRequests.slice(0, Math.min(visibleRequestCount, visibleRequests.length));

  function renderStatusCell(request: SignatureRequest) {
    const { totalSigners, signedCount, isCompleted, isPending, isVoided, nextSigner } =
      getRequestProgress(request);

    let className =
      "inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium leading-none ";

    if (isVoided) {
      className += "text-rose-600";
    } else if (isCompleted) {
      className += "text-emerald-600";
    } else if (isPending && request.attention === "you") {
      className += "text-violet-600";
    } else {
      className += "text-amber-600";
    }

    const progressPercent =
      totalSigners > 0 ? Math.min(100, Math.max(0, (signedCount / totalSigners) * 100)) : 0;
    const waitingLabel =
      request.attention === "you" ? "Waiting for You" : `Waiting for ${nextSigner?.name ?? "Next signer"}`;

    return (
      <div className="relative min-w-0 space-y-1">
        {!isPending ? (
          <span className={`${className} text-[14px]`}>
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Ban className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {isCompleted ? "Completed" : "Voided"}
          </span>
        ) : null}
        {isPending ? (
          <>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[#6A4EE8] transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="relative flex w-full min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => toggleSignerOrder(request.id)}
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={`Show signer order for ${request.documentName}`}
                aria-expanded={openSignerOrderRequestId === request.id}
              >
                <Info className="h-3.5 w-3.5" aria-hidden />
              </button>
              <p className="min-w-0 flex-1 truncate text-[13px] leading-tight text-slate-500">
                {waitingLabel}
              </p>
              {openSignerOrderRequestId === request.id ? (
                <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Signing order
                  </p>
                  <div className="mt-2 space-y-2">
                    {request.signers.map((signer, index) => (
                      <div key={signer.email} className="flex items-center gap-2 text-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                          {index + 1}
                        </span>
                        <span className="min-w-0 truncate text-slate-900">{signer.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  const showEmptyState = visibleRequests.length === 0;

  return (
    <section className="mt-0">
      <div className="xl:hidden">
        <div className="divide-y divide-slate-100">
          {showEmptyState
              ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-slate-500">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <FileSignature className="h-6 w-6" aria-hidden />
                  </div>
                  <p className="max-w-sm text-sm text-slate-600">
                    No signature requests yet — send your first one.
                  </p>
                </div>
                )
              : requestsToShow.map((request) => {
                const isSelected = activeRequest?.id === request.id;

                return (
                  <div
                    key={request.id}
                    className={`flex items-start justify-between gap-3 py-4 ${
                      isSelected ? "bg-[#F8FAFF]" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <button
                        type="button"
                        onClick={() => setActiveRequest(request)}
                        aria-pressed={isSelected}
                        className={`block truncate text-left font-semibold text-slate-900 transition hover:text-[#5C3EDB] ${
                          isSelected ? "text-[#5C3EDB]" : ""
                        }`}
                      >
                        {request.documentName}
                      </button>
                      {request.projectName ? (
                        <div className="truncate text-xs text-slate-500">{request.projectName}</div>
                      ) : null}
                      <div className="truncate text-xs text-slate-500">
                        {request.primaryRecipientName}
                      </div>
                      <div>{renderStatusCell(request)}</div>
                      <div className="text-xs text-slate-500">{request.updated}</div>
                    </div>
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => setActiveRequest(request)}
                        aria-pressed={isSelected}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <ArrowRight className="h-4 w-4 stroke-[2.5]" aria-hidden />
                      </button>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      <div className="hidden xl:block">
        <div className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {showEmptyState
                ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-sm text-slate-500">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <FileSignature className="h-6 w-6" aria-hidden />
                    </div>
                    <p className="max-w-sm text-sm text-slate-600">
                      No signature requests yet — send your first one.
                    </p>
                  </div>
                  )
                : requestsToShow.map((request) => {
                  const isSelected = activeRequest?.id === request.id;

                  return (
                    <div
                      key={request.id}
                      className={`flex flex-col gap-3 px-0 py-4 text-sm text-slate-700 md:grid md:items-start md:gap-8 md:py-3 xl:gap-8 ${
                        isSelected ? "bg-[#F8FAFF]" : "bg-white"
                      }`}
                      style={{ gridTemplateColumns: "var(--sc-requests-grid)" }}
                    >
                      <div className="flex items-start justify-between gap-3 md:contents">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setActiveRequest(request)}
                            aria-pressed={isSelected}
                            className={`block max-w-full truncate text-left font-semibold text-slate-900 transition hover:text-[#5C3EDB] ${
                              isSelected ? "text-[#5C3EDB]" : ""
                            }`}
                          >
                            {request.documentName}
                          </button>
                          {request.projectName ? (
                            <div className="truncate text-xs text-slate-500">
                              {request.projectName}
                            </div>
                          ) : null}
                        </div>
                        <div className="md:hidden">
                          <button
                            type="button"
                            onClick={() => setActiveRequest(request)}
                            aria-pressed={isSelected}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <ArrowRight className="h-4 w-4 stroke-[2.5]" aria-hidden />
                          </button>
                        </div>
                      </div>
                      <div className="md:hidden">{renderStatusCell(request)}</div>
                      <div className="md:hidden">{renderSentOn(request)}</div>
                      <div className="hidden min-w-0 md:block">
                        {renderStatusCell(request)}
                      </div>
                      <div className="hidden min-w-0 md:block md:pl-[28px] xl:pl-[32px]">
                        {renderSentOn(request)}
                      </div>
                      <div className="relative hidden items-center justify-end md:flex">
                        <button
                          type="button"
                          onClick={() => setActiveRequest(request)}
                          aria-pressed={isSelected}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <ArrowRight className="h-4 w-4 stroke-[2.5]" aria-hidden />
                        </button>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
      {activeRequest ? (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            aria-label="Close status details"
            className="flex-1 bg-black/30"
            onClick={() => setActiveRequest(null)}
          />
          <aside className="h-full w-full max-w-md border-l border-slate-200 bg-[#fbfbfe] shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Status details
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                  {activeRequest.documentName}
                </p>
                {activeRequest.projectName ? (
                  <p className="truncate text-xs text-slate-500">
                    Project: {activeRequest.projectName}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="ml-3 text-xs font-medium text-slate-500 hover:text-slate-700"
                onClick={() => setActiveRequest(null)}
              >
                Close
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Overall status
                </p>
                <div className="mt-2">
                  {renderStatusCell(activeRequest)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Signers
                </p>
                <ul className="mt-2 space-y-2">
                  {activeRequest.signers.map((signer) => (
                    <li key={signer.email} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            signer.hasSigned ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{signer.name}</p>
                          <p className="text-xs text-slate-500">{signer.email}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-slate-700">
                        {signer.hasSigned ? "Signed" : "Pending"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Actions
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full bg-[#6A4EE8] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#5C3EDB]"
                  >
                    Resend request
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      const url = `${window.location.origin}/signature-request/${activeRequest.id}`;
                      if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(url).catch(() => {});
                      }
                    }}
                  >
                    Copy link
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Document preview
                </p>
                <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
                  First page thumbnail placeholder
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
