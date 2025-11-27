"use client";

import { useEffect, useState } from "react";

type SignatureRequest = {
  id: string;
  document: string;
  recipient: string;
  status: string;
  updated: string;
};

const SKELETON_ROWS = 6;

export default function SignatureRequestsTable() {
  const [requests, setRequests] = useState<SignatureRequest[] | null>(null);

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

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
          Signature requests
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.7fr)_minmax(0,1.2fr)_minmax(0,1.1fr)] gap-4 border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
          <span>Document</span>
          <span>Recipient</span>
          <span>Status</span>
          <span className="text-right">Last updated</span>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading
            ? Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.7fr)_minmax(0,1.2fr)_minmax(0,1.1fr)] gap-4 px-4 py-3"
                >
                  <div className="h-4 w-3/4 rounded-full bg-slate-100 skeleton-shimmer" />
                  <div className="h-4 w-5/6 rounded-full bg-slate-100 skeleton-shimmer" />
                  <div className="h-4 w-1/3 rounded-full bg-slate-100 skeleton-shimmer" />
                  <div className="ml-auto h-4 w-1/3 rounded-full bg-slate-100 skeleton-shimmer" />
                </div>
              ))
            : requests?.map((request) => (
                <div
                  key={request.id}
                  className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.7fr)_minmax(0,1.2fr)_minmax(0,1.1fr)] gap-4 px-4 py-3 text-sm text-slate-700"
                >
                  <div className="truncate font-medium text-slate-900">
                    {request.document}
                  </div>
                  <div className="truncate text-slate-600">
                    {request.recipient}
                  </div>
                  <div className="text-slate-700">
                    {request.status}
                  </div>
                  <div className="text-right text-slate-500">
                    {request.updated}
                  </div>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}

