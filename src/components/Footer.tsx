"use client";

import RevealOnScroll from "@/components/RevealOnScroll";
import { siInstagram, siTiktok, siX } from "simple-icons";

type FooterProps = {
  reveal?: boolean;
};

function SocialIcon(props: { label: string; href?: string; name: string; iconPath: string }) {
  const { label, href = "#", name, iconPath } = props;
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-3 text-[13px] text-slate-400 transition hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-300" aria-hidden="true">
        <path fill="currentColor" d={iconPath} />
      </svg>
      <span>{name}</span>
    </a>
  );
}

export default function Footer({ reveal = true }: FooterProps) {
  const footerContent = (
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pt-12 pb-8 sm:px-6 lg:px-8">
        {/* Top grid */}
        <div className="relative z-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-10">
          {/* Features */}
          <div>
            <h3 className="text-sm font-semibold text-slate-50">Features</h3>
            <div className="mt-4 space-y-2">
              <a href="#" className="block text-[13px] text-slate-400 transition hover:text-white">
                Merge Documents
              </a>
              <a href="#" className="block text-[13px] text-slate-400 transition hover:text-white">
                Edit &amp; Annotate
              </a>
              <a href="#" className="block text-[13px] text-slate-400 transition hover:text-white">
                Sign Documents
              </a>
              <a href="#" className="block text-[13px] text-slate-400 transition hover:text-white">
                Split &amp; Reorder
              </a>
            </div>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-slate-50">Support</h3>
            <div className="mt-4 space-y-2">
              <a href="#" className="block text-[13px] text-slate-400 transition hover:text-white">
                Help Center
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-slate-50">Product</h3>
            <div className="mt-4 space-y-2">
              <a href="/pricing" className="block text-[13px] text-slate-400 transition hover:text-white">
                Pricing
              </a>
              <a href="#" className="block text-[13px] text-slate-400 transition hover:text-white">
                About Us
              </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-slate-50">Legal</h3>
            <div className="mt-4 space-y-2">
              <a href="#" className="block text-[13px] text-slate-400 transition hover:text-white">
                Terms of Service
              </a>
              <a href="#" className="block text-[13px] text-slate-400 transition hover:text-white">
                Privacy Policy
              </a>
            </div>
          </div>

          {/* Social */}
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-50">Follow us</h3>
            <div className="mt-4 flex flex-col gap-3 text-slate-400">
              <SocialIcon
                label="MergifyPDF on TikTok"
                href="https://www.tiktok.com/@mergify.pdf"
                name="TikTok"
                iconPath={siTiktok.path}
              />
              <SocialIcon
                label="MergifyPDF on Instagram"
                href="https://www.instagram.com/mergifypdf/"
                name="Instagram"
                iconPath={siInstagram.path}
              />
              <SocialIcon
                label="MergifyPDF on X (Twitter)"
                href="https://x.com/MergifyPDF"
                name="X"
                iconPath={siX.path}
              />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 mt-7 pt-3">
          <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
            <p className="text-xs text-slate-400 sm:text-sm">
              © 2026 MergifyPDF. All rights reserved.
            </p>
          </div>
        </div>
      </div>
  );

  if (!reveal) {
    return <footer className="relative overflow-hidden border-t border-white/12 bg-[#0b0d18] text-slate-400 shadow-[0_-1px_0_rgba(255,255,255,0.06),0_-20px_70px_rgba(0,0,0,0.18)]">{footerContent}</footer>;
  }

  return (
    <RevealOnScroll as="footer" variant="fade" className="relative overflow-hidden border-t border-white/12 bg-[#0b0d18] text-slate-400 shadow-[0_-1px_0_rgba(255,255,255,0.06),0_-20px_70px_rgba(0,0,0,0.18)]">
      {footerContent}
    </RevealOnScroll>
  );
}
