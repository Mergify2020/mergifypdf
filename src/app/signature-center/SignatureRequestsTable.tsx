"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, FileSignature, MoreHorizontal } from "lucide-react";

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
  updated: string;
  state?: "pending" | "completed" | "voided";
};

const SKELETON_ROWS = 6;

const FILTERS = ["All", "Pending", "Completed"] as const;

type FilterValue = (typeof FILTERS)[number];

export default function SignatureRequestsTable() {
  const [requests, setRequests] = useState<SignatureRequest[] | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterValue>("All");
  const [openMenuForId, setOpenMenuForId] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] = useState<SignatureRequest | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Simulate loading so the skeletons are visible while real data is fetched.
      await new Promise((resolve) => setTimeout(resolve, 600));

      if (cancelled) return;

      // Placeholder data – replace with real API results when wired up.
      setRequests([
        {
          id: "1",
          documentName: "Vendor Renewal Agreement",
          projectName: "Pinnacol Renewal 2025",
          primaryRecipientName: "Pinnacol Ops Team",
          primaryRecipientEmail: "operations@pinnacolassurance.com",
          signers: [
            { name: "Leticia Silva", email: "leticia@mergifypdf.com", hasSigned: true },
            { name: "Pinnacol Ops", email: "operations@pinnacolassurance.com", hasSigned: false },
            { name: "Legal Reviewer", email: "legal@pinnacolassurance.com", hasSigned: false },
          ],
          updated: "Today • 3:44 AM",
          state: "pending",
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
          updated: "Yesterday • 9:24 AM",
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
          updated: "Tuesday • 10:41 AM",
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
          updated: "Monday • 1:18 PM",
          state: "completed",
        },
        {
          id: "5",
          documentName: "Onboarding Packet",
          projectName: "Acme HR Setup",
          primaryRecipientName: "Acme HR",
          primaryRecipientEmail: "hr@acmecorp.com",
          signers: [
            { name: "HR Lead", email: "hr@acmecorp.com", hasSigned: false },
            { name: "New Hire", email: "newhire@acmecorp.com", hasSigned: false },
          ],
          updated: "Last week",
          state: "pending",
        },
      ]);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = !requests;

  const summary = useMemo(() => {
    if (!requests) return null;

    let pending = 0;
    let waitingOnOthers = 0;
    let completed = 0;
    const expiringSoon = 0;

    for (const request of requests) {
      const { signedCount, totalSigners, isPending, isCompleted } = getRequestProgress(request);

      if (isPending) {
        pending += 1;
        if (signedCount > 0 && signedCount < totalSigners) {
          waitingOnOthers += 1;
        }
      } else if (isCompleted) {
        completed += 1;
      }
    }

    return { pending, waitingOnOthers, completed, expiringSoon };
  }, [requests]);

  const visibleRequests = useMemo(() => {
    if (!requests) return [];
    if (activeFilter === "All") return requests;

    return requests.filter((request) => {
      const { isCompleted, isPending } = getRequestProgress(request);
      if (activeFilter === "Pending") {
        return isPending;
      }
      if (activeFilter === "Completed") {
        return isCompleted;
      }
      return true;
    });
  }, [activeFilter, requests]);

  function getRequestProgress(request: SignatureRequest) {
    const totalSigners = request.signers.length;
    const signedCount = request.signers.filter((signer) => signer.hasSigned).length;
    const isVoided = request.state === "voided";
    const isCompleted = !isVoided && totalSigners > 0 && signedCount === totalSigners;
    const isPending = !isVoided && !isCompleted;
    const nextSigner = request.signers.find((signer) => !signer.hasSigned) ?? null;

    return { totalSigners, signedCount, isCompleted, isPending, isVoided, nextSigner };
  }

  function renderStatusCell(request: SignatureRequest) {
    const { totalSigners, signedCount, isCompleted, isPending, isVoided, nextSigner } =
      getRequestProgress(request);

    let primaryLabel: string;
    if (isVoided) {
      primaryLabel = "Voided by Sender";
    } else if (isCompleted) {
      primaryLabel = "Completed";
    } else {
      primaryLabel = `Awaiting Signatures (${signedCount} of ${totalSigners || 1} Signed)`;
    }

    const tooltip = isVoided
      ? "This request was voided"
      : isCompleted
        ? "All signatures collected"
        : nextSigner
          ? `Pending signature from ${nextSigner.name}`
          : "Pending signatures";

    return (
      <div className="space-y-1" title={tooltip}>
        <span
          className={
            isVoided
              ? "inline-flex items-center rounded-[999px] border border-transparent bg-[#DC2626] px-2.5 py-0.5 text-xs font-medium text-white"
              : isCompleted
                ? "inline-flex items-center rounded-[999px] border border-transparent bg-[#16A34A] px-2.5 py-0.5 text-xs font-medium text-white"
                : "inline-flex items-center rounded-[999px] border border-transparent bg-[#E3A400] px-2.5 py-0.5 text-xs font-medium text-white"
          }
        >
          {primaryLabel}
        </span>
        {totalSigners > 0 ? (
          <div className="flex items-center gap-1.5">
            {request.signers.map((signer) => {
              const dotClass = signer.hasSigned ? "bg-[#22C55E]" : "bg-slate-300";

              return (
                <span
                  key={signer.email}
                  className={`h-2.5 w-2.5 rounded-full ${dotClass}`}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  const showEmptyState = !isLoading && visibleRequests.length === 0;

  return (
    <section className="mt-2">
      {summary ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[8px] bg-[#F9FAFB] px-3 py-2 text-xs text-slate-600">
          <span className="font-medium text-slate-700">Summary:</span>
          <span>{summary.pending} requests pending</span>
          <span>{summary.waitingOnOthers} waiting on others</span>
          <span>{summary.completed} completed this week</span>
          <span>{summary.expiringSoon} expiring soon</span>
        </div>
      ) : null}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
          Signature requests
        </h2>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const isActive = filter === activeFilter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`inline-flex items-center rounded-[999px] border px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? "border-[#6A4EE8] bg-[#6A4EE8] text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_auto] gap-4 border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
          <span>Document</span>
          <span>Recipient</span>
          <span>Status</span>
          <span className="text-right">Last updated</span>
          <span className="sr-only">Actions</span>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading
            ? Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_auto] gap-4 bg-white px-4 py-3 even:bg-slate-50"
                >
                  <div className="h-4 w-3/4 rounded-full bg-slate-100 skeleton-shimmer" />
                  <div className="h-4 w-5/6 rounded-full bg-slate-100 skeleton-shimmer" />
                  <div className="h-4 w-1/3 rounded-full bg-slate-100 skeleton-shimmer" />
                  <div className="ml-auto h-4 w-1/3 rounded-full bg-slate-100 skeleton-shimmer" />
                  <div className="h-7 w-16 rounded-full bg-slate-100 skeleton-shimmer" />
                </div>
              ))
            : showEmptyState
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
              : visibleRequests.map((request, index) => {
                const { isCompleted } = getRequestProgress(request);

                return (
                  <div
                    key={request.id}
                    className={`grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_auto] gap-4 px-4 py-3 text-sm text-slate-700 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50"
                    } hover:bg-[#F3F4FF]`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">
                        {request.documentName}
                      </div>
                    {request.projectName ? (
                      <div className="truncate text-xs text-slate-500">
                        {request.projectName}
                      </div>
                    ) : null}
                    </div>
                    <div className="truncate text-slate-600">
                      {request.primaryRecipientName}
                    </div>
                    <div>
                      {renderStatusCell(request)}
                    </div>
                    <div className="text-right text-slate-500">
                      {request.updated}
                    </div>
                    <div className="relative flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuForId((current) => (current === request.id ? null : request.id))
                        }
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 p-1.5 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </button>
                      {openMenuForId === request.id ? (
                        <div className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-slate-200 bg-white py-1 text-xs shadow-lg">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setActiveRequest(request);
                              setOpenMenuForId(null);
                            }}
                          >
                            <span>View details</span>
                            <ArrowUpRight className="h-3 w-3" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              console.log("Resend request", request.id);
                              setOpenMenuForId(null);
                            }}
                          >
                            <span>Resend request</span>
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!isCompleted}
                            onClick={() => {
                              if (!isCompleted) return;
                              console.log("Download signed PDF", request.id);
                              setOpenMenuForId(null);
                            }}
                          >
                            <span>Download signed PDF</span>
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50"
                            onClick={() => {
                              console.log("Cancel request", request.id);
                              setOpenMenuForId(null);
                            }}
                          >
                            <span>Cancel request</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
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
          <aside className="h-full w-full max-w-md border-l border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
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

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-4 text-sm">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Overall status
                </p>
                {renderStatusCell(activeRequest)}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Signers
                </p>
                <ul className="space-y-2">
                  {activeRequest.signers.map((signer) => (
                    <li key={signer.email} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            signer.hasSigned ? "bg-[#22C55E]" : "bg-slate-300"
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

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Actions
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-[999px] bg-[#6A4EE8] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#5C3EDB]"
                  >
                    Resend request
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-[999px] border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
                <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
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
