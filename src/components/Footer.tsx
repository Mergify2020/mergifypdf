"use client";

import RevealOnScroll from "@/components/RevealOnScroll";

type FooterProps = {
  reveal?: boolean;
};

function SocialIcon(props: { label: string; href?: string; name: string; badge: string }) {
  const { label, href = "#", name, badge } = props;
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-3 text-[13px] text-slate-300 transition hover:text-white"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-500/50 text-[10px] font-semibold text-slate-200">
        {badge}
      </span>
      <span>{name}</span>
    </a>
  );
}

export default function Footer({ reveal = true }: FooterProps) {
  const footerContent = (
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-12 pb-8 sm:px-6 lg:px-8">
        {/* Top grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-10">
          {/* Features */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Features</h3>
            <div className="mt-4 space-y-2">
              <a href="#" className="block text-[13px] text-slate-300 transition hover:text-white">
                Merge Documents
              </a>
              <a href="#" className="block text-[13px] text-slate-300 transition hover:text-white">
                Edit &amp; Annotate
              </a>
              <a href="#" className="block text-[13px] text-slate-300 transition hover:text-white">
                Sign Documents
              </a>
              <a href="#" className="block text-[13px] text-slate-300 transition hover:text-white">
                Split &amp; Reorder
              </a>
            </div>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Support</h3>
            <div className="mt-4 space-y-2">
              <a href="#" className="block text-[13px] text-slate-300 transition hover:text-white">
                Help Center
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Product</h3>
            <div className="mt-4 space-y-2">
              <a href="/pricing" className="block text-[13px] text-slate-300 transition hover:text-white">
                Pricing
              </a>
              <a href="#" className="block text-[13px] text-slate-300 transition hover:text-white">
                About Us
              </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Legal</h3>
            <div className="mt-4 space-y-2">
              <a href="#" className="block text-[13px] text-slate-300 transition hover:text-white">
                Terms of Service
              </a>
              <a href="#" className="block text-[13px] text-slate-300 transition hover:text-white">
                Privacy Policy
              </a>
            </div>
          </div>

          {/* Social */}
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-100">Follow us</h3>
            <div className="mt-4 flex flex-col gap-3 text-slate-300">
              <SocialIcon
                label="MergifyPDF on TikTok"
                href="https://www.tiktok.com/@mergify.pdf"
                name="TikTok"
                badge="T"
              />
              <SocialIcon
                label="MergifyPDF on Instagram"
                href="https://www.instagram.com/mergifypdf/"
                name="Instagram"
                badge="IG"
              />
              <SocialIcon
                label="MergifyPDF on X (Twitter)"
                href="https://x.com/MergifyPDF"
                name="X"
                badge="X"
              />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-slate-700/40 pt-4">
          <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
            <p className="text-xs text-slate-400 sm:text-sm">
              © 2026 MergifyPDF. All rights reserved.
            </p>
          </div>
        </div>
      </div>
  );

  if (!reveal) {
    return <footer className="border-t border-slate-700/40 bg-[#1E2230] text-slate-300">{footerContent}</footer>;
  }

  return (
    <RevealOnScroll as="footer" variant="fade" className="border-t border-slate-700/40 bg-[#1E2230] text-slate-300">
      {footerContent}
    </RevealOnScroll>
  );
}
