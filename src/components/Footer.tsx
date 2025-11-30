import React from "react";
import { siInstagram, siTiktok, siYoutube, siThreads, siX } from "simple-icons";

type IconProps = React.SVGProps<SVGSVGElement>;

function SocialIcon(
  props: React.PropsWithChildren<{ label: string; href?: string }>
) {
  const { label, href = "#", children } = props;
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
    >
      {children}
    </a>
  );
}

function TikTokIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      aria-hidden="true"
      {...props}
    >
      <path fill="currentColor" d={siTiktok.path} />
    </svg>
  );
}

function ThreadsIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      aria-hidden="true"
      {...props}
    >
      <path fill="currentColor" d={siThreads.path} />
    </svg>
  );
}

function InstagramIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      aria-hidden="true"
      {...props}
    >
      <path fill="currentColor" d={siInstagram.path} />
    </svg>
  );
}

function YoutubeIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      aria-hidden="true"
      {...props}
    >
      <path fill="currentColor" d={siYoutube.path} />
    </svg>
  );
}

function XIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      aria-hidden="true"
      {...props}
    >
      <path fill="currentColor" d={siX.path} />
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
                <TikTokIcon />
              </SocialIcon>
              <SocialIcon
                label="MergifyPDF on Threads"
                href="https://www.threads.com/@mergifypdf"
              >
                <ThreadsIcon />
              </SocialIcon>
              <SocialIcon
                label="MergifyPDF on Instagram"
                href="https://www.instagram.com/mergifypdf/"
              >
                <InstagramIcon />
              </SocialIcon>
              <SocialIcon label="MergifyPDF on YouTube">
                <YoutubeIcon />
              </SocialIcon>
              <SocialIcon
                label="MergifyPDF on X (Twitter)"
                href="https://x.com/MergifyPDF"
              >
                <XIcon />
              </SocialIcon>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
