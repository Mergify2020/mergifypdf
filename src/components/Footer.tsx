"use client";

import React from "react";
import { siInstagram, siTiktok, siX } from "simple-icons";
import RevealOnScroll from "@/components/RevealOnScroll";

type IconProps = React.SVGProps<SVGSVGElement>;

function SocialIcon(props: { label: string; href?: string; name: string; icon: React.ReactNode }) {
  const { label, href = "#", name, icon } = props;
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-3 text-[13px] text-slate-300 transition hover:text-white"
    >
      <span className="text-slate-200">{icon}</span>
      <span>{name}</span>
    </a>
  );
}

function TikTokIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden="true"
      {...props}
    >
      <path fill="currentColor" d={siTiktok.path} />
    </svg>
  );
}

function InstagramIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden="true"
      {...props}
    >
      <path fill="currentColor" d={siInstagram.path} />
    </svg>
  );
}

function XIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={17}
      height={17}
      aria-hidden="true"
      {...props}
    >
      <path fill="currentColor" d={siX.path} />
    </svg>
  );
}

export default function Footer() {
  return (
    <RevealOnScroll
      as="footer"
      variant="fade"
      className="border-t border-slate-700/40 bg-[#1E2230] text-slate-300"
    >
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
              <a href="#" className="block text-[13px] text-slate-300 transition hover:text-white">
                FAQ
              </a>
              <a href="#" className="block text-[13px] text-slate-300 transition hover:text-white">
                Contact Support
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
                icon={<TikTokIcon />}
              />
              <SocialIcon
                label="MergifyPDF on Instagram"
                href="https://www.instagram.com/mergifypdf/"
                name="Instagram"
                icon={<InstagramIcon />}
              />
              <SocialIcon
                label="MergifyPDF on X (Twitter)"
                href="https://x.com/MergifyPDF"
                name="X"
                icon={<XIcon />}
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
    </RevealOnScroll>
  );
}
