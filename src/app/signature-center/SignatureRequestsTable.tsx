"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, FileSignature } from "lucide-react";

type SignatureRequest = {
  id: string;
  document: string;
  recipient: string;
  status: string;
  updated: string;
};

const SKELETON_ROWS = 6;

const FILTERS = ["All", "Awaiting Signature", "Sent", "Viewed", "Completed"] as const;

type FilterValue = (typeof FILTERS)[number];

export default function SignatureRequestsTable() {
  const [requests, setRequests] = useState<SignatureRequest[] | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterValue>("All");

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
          document: "Vendor Renewal Agreement",
          recipient: "operations@pinnacolassurance.com",
          status: "Awaiting signature",
          updated: "Today • 3:44 AM",
        },
        {
          id: "2",
          document: "Client Audit Packet",
          recipient: "finance@goldenrainmasonry.com",
          status: "Sent",
          updated: "Yesterday • 9:24 AM",
        },
        {
          id: "3",
          document: "Compliance Addendum",
          recipient: "legal@mergifypdf.com",
          status: "Viewed",
          updated: "Tuesday • 10:41 AM",
        },
        {
          id: "4",
          document: "Project T – SOW",
          recipient: "projects@northbridgepartners.co",
          status: "Completed",
          updated: "Monday • 1:18 PM",
        },
        {
          id: "5",
          document: "Onboarding Packet",
          recipient: "hr@acmecorp.com",
          status: "Awaiting signature",
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
      if (activeFilter === "Awaiting Signature") {
        return request.status.toLowerCase().startsWith("awaiting");
      }
      return request.status.toLowerCase() === activeFilter.toLowerCase();
    });
  }, [activeFilter, requests]);

  function renderStatusPill(status: string) {
    const normalized = status.toLowerCase();

    if (normalized.startsWith("awaiting")) {
      return (
        <span className="inline-flex items-center rounded-full border border-[#C7B9FF] bg-[#F5F3FF] px-2.5 py-0.5 text-xs font-medium text-[#6A4EE8]">
          {status}
        </span>
      );
    }

    if (normalized === "sent") {
      return (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {status}
        </span>
      );
    }

    if (normalized === "viewed") {
      return (
        <span className="inline-flex items-center rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-medium text-[#1D4ED8]">
          {status}
        </span>
      );
    }

    if (normalized === "completed") {
      return (
        <span className="inline-flex items-center rounded-full border border-[#A7F3D0] bg-[#ECFDF3] px-2.5 py-0.5 text-xs font-medium text-[#166534]">
          {status}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
        {status}
      </span>
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
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? "border-[#6A4EE8] bg-[#F5F3FF] text-[#4C3ACF]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                  <div className="truncate font-medium text-slate-900">
                    {request.document}
                  </div>
                  <div className="truncate text-slate-600">
                    {request.recipient}
                  </div>
                  <div>
                    {renderStatusPill(request.status)}
                  </div>
                  <div className="text-right text-slate-500">
                    {request.updated}
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Open
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
