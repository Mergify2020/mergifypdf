import React from "react";
import { Instagram, Twitter, Youtube } from "lucide-react";

type IconProps = React.SVGProps<SVGSVGElement>;

function SocialIcon(
  props: React.PropsWithChildren<{ label: string; href?: string }>
) {
  const { label, href = "#", children } = props;
  return (
    <a
      href={href}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
    >
      {children}
    </a>
  );
}

function TikTokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M10 4.5v9.3a2.4 2.4 0 1 1-2.4-2.4c.5 0 .9.1 1.3.3M13.2 4.5C13.5 6.3 14.8 7.5 16.6 7.8l.9.1"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.2 8.8V11c0 2.2-1.4 3.7-3.6 3.7"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThreadsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
      <path
        d="M9 8.4C9.6 7.7 10.5 7.4 11.6 7.4c2 0 3.4 1.2 3.4 3.2 0 2.2-1.4 3.6-3.4 3.6-1.3 0-2.3-.7-2.7-1.8m2.9-4.1c1.1.1 2 .6 2.2 1.9-.5-.3-1.1-.4-1.6-.5-.2-.6-.7-1-1.4-1-1 0-1.6.6-1.6 1.5 0 .8.5 1.4 1.5 1.6l.7.1c.6.1.8.4.8.8 0 .6-.5 1-1.2 1-0.8 0-1.4-.4-1.7-1"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
              <SocialIcon
                label="MergifyPDF on TikTok"
                href="https://www.tiktok.com/@mergify.pdf"
              >
                <TikTokIcon className="h-5 w-5" />
              </SocialIcon>
              <SocialIcon
                label="MergifyPDF on Threads"
                href="https://www.threads.com/@mergifypdf"
              >
                <ThreadsIcon className="h-5 w-5" />
              </SocialIcon>
              <SocialIcon
                label="MergifyPDF on Instagram"
                href="https://www.instagram.com/mergifypdf/"
              >
                <Instagram className="h-5 w-5" strokeWidth={2.2} />
              </SocialIcon>
              <SocialIcon label="MergifyPDF on YouTube">
                <Youtube className="h-5 w-5" strokeWidth={2.2} />
              </SocialIcon>
              <SocialIcon label="MergifyPDF on X (Twitter)">
                <Twitter className="h-5 w-5" strokeWidth={2.2} />
              </SocialIcon>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
