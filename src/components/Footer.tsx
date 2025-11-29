import React from "react";
import { Facebook, Instagram, Linkedin, Music2, Twitter } from "lucide-react";

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

          {/* Control Center */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Control Center</h3>
            <div className="mt-4 space-y-2">
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Project Dashboard
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Signature Dashboard
              </a>
              <a href="#" className="block text-sm text-slate-600 transition hover:text-slate-900">
                Team Dashboard (Coming 2026)
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

            <div className="flex items-center gap-3 text-slate-500">
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="MergifyPDF on TikTok"
              >
                <Music2 className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="MergifyPDF on Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="MergifyPDF on X (Twitter)"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="MergifyPDF on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="MergifyPDF on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
