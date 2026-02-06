"use client";

import { useState } from "react";
import HeroStats from "@/components/HeroStats";
import HeroUploadCard from "@/components/HeroUploadCard";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function HeroUploadAndBullets() {
  const [heroVisible, setHeroVisible] = useState(false);

  return (
    <>
      <div className="flex justify-center lg:col-start-2 lg:row-span-2 lg:justify-end lg:self-start">
        <RevealOnScroll
          as="div"
          className="w-full max-w-[600px] rounded-2xl border border-white/70 bg-white/35 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.7),0_0_18px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:max-w-[760px] lg:h-full"
          onVisible={() => setHeroVisible(true)}
        >
          <div className="flex h-full flex-col rounded-2xl border border-white/70 bg-white/70 p-4 text-center shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-5">
            <HeroUploadCard />
          </div>
        </RevealOnScroll>
      </div>

      <RevealOnScroll
        as="div"
        className="space-y-5 text-center lg:col-start-1 lg:text-left"
        forceVisible={heroVisible}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-600 lg:flex-col lg:items-start lg:gap-y-5">
          {["Upload and start instantly", "Fast, reliable, and secure"].map((badge) => (
            <div key={badge} className="flex items-center gap-4 text-[1rem] font-semibold text-slate-700">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6D5EF3] text-[12px] text-white shadow-[0_6px_16px_rgba(109,94,243,0.25)]"
                aria-hidden="true"
              >
                ✓
              </span>
              <span>{badge}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center lg:justify-start">
          <HeroStats />
        </div>
      </RevealOnScroll>
    </>
  );
}
