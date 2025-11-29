import React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

function SocialIcon(props: React.PropsWithChildren<{ label: string }>) {
  const { label, children } = props;
  return (
    <a
      href="#"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
    >
      {children}
    </a>
  );
}

function TikTokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M14 5.5v4.25c0 1.8-1.46 3.25-3.25 3.25A2.75 2.75 0 0 0 8 15.75C8 17.54 9.46 19 11.25 19S14.5 17.54 14.5 15.75V8.5c.7.8 1.62 1.4 2.7 1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect
        x={6}
        y={6}
        width={12}
        height={12}
        rx={3.5}
        ry={3.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
      />
      <circle
        cx={12}
        cy={12}
        r={3}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
      />
      <circle cx={16} cy={8} r={0.9} fill="currentColor" />
    </svg>
  );
}

function TwitterXIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M8 7.5 16.5 17M16 7 7.5 17.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M13 5.5h-1.5A2.5 2.5 0 0 0 9 8v2H7.5v3H9V19h3v-6h2.2l.3-3H12V8c0-.8.4-1.3 1.2-1.3H15V5.7A12 12 0 0 0 13 5.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkedInIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect
        x={5}
        y={9.5}
        width={3}
        height={9.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <circle
        cx={6.5}
        cy={6.5}
        r={1.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
      />
      <path
        d="M11 19v-6a2.5 2.5 0 0 1 2.5-2.5c1.4 0 2.5 1.1 2.5 2.5V19"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
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
              <SocialIcon label="MergifyPDF on TikTok">
                <TikTokIcon className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon label="MergifyPDF on Instagram">
                <InstagramIcon className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon label="MergifyPDF on X (Twitter)">
                <TwitterXIcon className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon label="MergifyPDF on Facebook">
                <FacebookIcon className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon label="MergifyPDF on LinkedIn">
                <LinkedInIcon className="h-4 w-4" />
              </SocialIcon>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
