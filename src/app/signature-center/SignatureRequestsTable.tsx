"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, FileSignature } from "lucide-react";

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
};

const SKELETON_ROWS = 6;

const FILTERS = ["All", "Pending", "Completed"] as const;

type FilterValue = (typeof FILTERS)[number];

export default function SignatureRequestsTable() {
  const [requests, setRequests] = useState<SignatureRequest[] | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterValue>("All");
  const [openMenuForId, setOpenMenuForId] = useState<string | null>(null);

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
        },
      ]);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = !requests;

  const visibleRequests = useMemo(() => {
    if (!requests) return [];
    if (activeFilter === "All") return requests;

    return requests.filter((request) => {
      const { isCompleted } = getRequestProgress(request);
      if (activeFilter === "Pending") {
        return !isCompleted;
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
    const isCompleted = totalSigners > 0 && signedCount === totalSigners;
    const nextSigner = request.signers.find((signer) => !signer.hasSigned) ?? null;

    return { totalSigners, signedCount, isCompleted, nextSigner };
  }

  function renderStatusCell(request: SignatureRequest) {
    const { totalSigners, signedCount, isCompleted, nextSigner } = getRequestProgress(request);

    const primaryLabel = isCompleted
      ? "Completed"
      : `Pending — ${signedCount}/${totalSigners || 1} signed`;

    const tooltip = isCompleted
      ? "All signatures collected"
      : nextSigner
        ? `Pending signature from ${nextSigner.name}`
        : "Pending signatures";

    return (
      <div className="space-y-1" title={tooltip}>
        <span
          className={
            isCompleted
              ? "inline-flex items-center rounded-[999px] border border-[#A7F3D0] bg-[#ECFDF3] px-2.5 py-0.5 text-xs font-medium text-[#166534]"
              : "inline-flex items-center rounded-[999px] border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
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
                    ? "border-[#1F456E] bg-[#1F456E] text-white shadow-sm"
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
              : visibleRequests.map((request, index) => (
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
                        Project: {request.projectName}
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
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Open
                      <span className="ml-0.5 text-[10px] text-slate-500">▾</span>
                    </button>
                    {openMenuForId === request.id ? (
                      <div className="absolute right-0 top-9 z-10 w-40 rounded-xl border border-slate-200 bg-white py-1 text-xs shadow-lg">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            console.log("Open request", request.id);
                            setOpenMenuForId(null);
                          }}
                        >
                          <span>Open request</span>
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
              ))}
        </div>
      </div>
    </section>
  );
}
