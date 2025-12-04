import { FileText, Sparkles } from "lucide-react";
import MergifySignCard from "./MergifySignCard";

export default function DashboardInsightsColumn() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#E4D9FF] bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg sm:p-6">
        <MergifySignCard />
      </div>

      <div className="rounded-2xl border border-[#E7F1FF] bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg sm:p-6">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <FileText className="h-3.5 w-3.5" />
          Document templates
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
          Reuse-ready documents for your workflows
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          W-9 forms, contracts, invoices, NDAs, and more. Save your most used document structures
          and start from a polished base instead of a blank page.
        </p>
        <button
          type="button"
          className="mt-4 inline-flex items-center text-sm font-semibold text-[#024d7c] hover:text-[#013a60]"
        >
          Browse Templates
          <span className="ml-1">→</span>
        </button>
      </div>

      <div className="rounded-[20px] bg-gradient-to-br from-blue-100/40 via-purple-100/40 to-pink-100/40 p-[1px] shadow-md transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="rounded-[18px] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <Sparkles className="h-3.5 w-3.5" />
                AI tools (coming soon)
              </p>
              <h2 className="mt-2 text-lg font-semibold leading-snug text-slate-900">
                Let AI handle the busywork
              </h2>
            </div>
            <span className="mt-1 inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-sky-700">
              Preview
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-700">
            We&apos;re building helpers that understand your PDFs so you can stay focused on the work
            that matters.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-800">
            <li>• Summarize PDFs</li>
            <li>• Rewrite or simplify text</li>
            <li>• Smart form detection</li>
          </ul>
          <p className="mt-4 text-xs text-slate-600">
            Watch this space — new AI features will roll out directly into your workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
