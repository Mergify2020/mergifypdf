import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#F3F4F6] text-slate-600">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Top grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* PDF Tools */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">PDF Tools</h3>
            <div className="mt-4 space-y-2">
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Merge PDFs
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Edit &amp; Annotate
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Sign Documents
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Reorder Pages
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Split PDF
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Extract Pages
              </a>
            </div>
          </div>

          {/* For Teams */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">For Teams</h3>
            <div className="mt-4 space-y-2">
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                PDF Workspaces
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Signature Requests
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Team Collaboration (coming 2026)
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Plans &amp; Pricing
              </a>
            </div>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Support</h3>
            <div className="mt-4 space-y-2">
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Help Center
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Tutorials
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                FAQ
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Contact Support
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Report an Issue
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Company</h3>
            <div className="mt-4 space-y-2">
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                About MergifyPDF
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Careers
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Blog
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Terms of Service
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-slate-200 pt-6">
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">MergifyPDF</span>
              </div>
              <p className="text-xs text-slate-500 sm:text-sm">
                © 2025 MergifyPDF. All rights reserved.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
              <a href="#" className="text-slate-600 transition hover:text-slate-900">
                Privacy
              </a>
              <a href="#" className="text-slate-600 transition hover:text-slate-900">
                Terms
              </a>
              <a href="#" className="text-slate-600 transition hover:text-slate-900">
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

