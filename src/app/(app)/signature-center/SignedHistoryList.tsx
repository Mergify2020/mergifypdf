"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useVisibleSignatureHistoryRows } from "./useVisibleSignatureHistoryRows";

type SignedHistoryItem = {
  id: string;
  documentName: string;
  documentType: string;
  projectName: string;
  signedOn: string;
};

const SIGNED_HISTORY: SignedHistoryItem[] = [
  {
    id: "h1",
    documentName: "HR Onboarding Packet",
    documentType: "Agreement",
    projectName: "Acme HR Setup",
    signedOn: "04/21/2026",
  },
  {
    id: "h2",
    documentName: "Statement of Work",
    documentType: "SOW",
    projectName: "Northbridge Projects",
    signedOn: "04/20/2026",
  },
  {
    id: "h3",
    documentName: "Compliance Addendum",
    documentType: "Agreement",
    projectName: "MergifyPDF Studio",
    signedOn: "04/19/2026",
  },
  {
    id: "h4",
    documentName: "Client Audit Packet",
    documentType: "Audit Packet",
    projectName: "Golden Rain FY25",
    signedOn: "04/14/2026",
  },
  {
    id: "h5",
    documentName: "Vendor Renewal Agreement",
    documentType: "Agreement",
    projectName: "Pinnacol Renewal 2025",
    signedOn: "04/13/2026",
  },
  {
    id: "h6",
    documentName: "Mutual NDA",
    documentType: "NDA",
    projectName: "Northbridge Projects",
    signedOn: "04/07/2026",
  },
  {
    id: "h7",
    documentName: "Master Services Addendum",
    documentType: "Addendum",
    projectName: "MergifyPDF Studio",
    signedOn: "04/06/2026",
  },
  {
    id: "h8",
    documentName: "Client Audit Packet",
    documentType: "Audit Packet",
    projectName: "Golden Rain FY25",
    signedOn: "03/31/2026",
  },
  {
    id: "h9",
    documentName: "Statement of Work",
    documentType: "SOW",
    projectName: "Northbridge Projects",
    signedOn: "03/30/2026",
  },
  {
    id: "h10",
    documentName: "Compliance Addendum",
    documentType: "Agreement",
    projectName: "MergifyPDF Studio",
    signedOn: "03/24/2026",
  },
];

export default function SignedHistoryList() {
  const visibleRowCount = useVisibleSignatureHistoryRows();
  const visibleHistory = SIGNED_HISTORY.slice(0, Math.min(visibleRowCount, SIGNED_HISTORY.length));
  const mobileVisibleHistory = SIGNED_HISTORY.slice(0, 5);

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:hidden md:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xl font-semibold tracking-tight text-slate-900">
            Signed History
          </p>
          <Link
            href="#sent-requests"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <span>View all history</span>
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          </Link>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {mobileVisibleHistory.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 py-4"
            >
              <div className="min-w-0 space-y-1 pr-1">
                <p className="line-clamp-2 text-[15px] font-semibold leading-tight text-slate-900">
                  {item.documentName}
                </p>
                <p className="truncate text-[13px] leading-tight text-slate-500">
                  {item.documentType}
                </p>
              </div>
              <div className="flex items-start gap-2 pt-0.5 justify-self-end">
                <div className="flex flex-col items-end text-right">
                  <span className="inline-flex items-center gap-1.5 text-[14px] font-medium leading-none text-emerald-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                    Signed
                  </span>
                  <p className="text-[13px] leading-tight text-slate-500">{item.signedOn}</p>
                </div>
                <span className="inline-flex h-8 w-8 items-center justify-center text-slate-500">
                  <ArrowRight className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:block xl:self-start">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xl font-semibold tracking-tight text-slate-900">
            Signed History
          </p>
          <Link
            href="#sent-requests"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <span>View all history</span>
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          </Link>
        </div>

        <div className="mt-5 flex flex-col">
          {visibleHistory.map((item, index) => (
            <div
              key={item.id}
              className={`flex flex-col gap-2 px-1 py-3 text-sm md:grid md:items-center md:gap-4 ${
                index !== visibleHistory.length - 1 ? "border-b border-slate-100" : ""
              }`}
              style={{ gridTemplateColumns: "var(--sc-history-grid)" }}
            >
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold leading-tight text-slate-900">{item.documentName}</p>
                <p className="truncate text-[13px] leading-tight text-slate-500">{item.documentType}</p>
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[14px] font-medium leading-none text-emerald-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                  Signed
                </span>
                <p className="text-[13px] leading-tight text-slate-500">{item.signedOn}</p>
              </div>
              <div className="flex items-center justify-end self-end md:self-auto">
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
