"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

export default function MergifySignCard() {
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);

  function handleOpenClick() {
    if (isOpening) return;
    setIsOpening(true);
    router.push("/signature-center");
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[10px] border border-[#E4D9FF] bg-white text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg ease-out ${
        isOpening ? "scale-[1.02] bg-[#F7F6FF] shadow-[0_16px_40px_rgba(15,23,42,0.12)]" : ""
      }`}
    >
      <div className="pointer-events-none absolute -bottom-16 -left-16 text-[#1C80D6] opacity-[0.04]">
        <svg
          aria-hidden
          className="h-40 w-40"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="14" y="10" width="32" height="44" rx="3" stroke="currentColor" strokeWidth="2.5" />
          <path d="M22 20H38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M22 27H34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M22 40C24 42.2 26.5 43.5 29 43.5C32 43.5 33.5 41.5 36.5 41.5C38.7 41.5 40.3 42.3 41.5 43.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="relative z-10 flex flex-col items-center gap-4 px-5 py-5 text-center">
        <div className="flex w-full max-w-[420px] flex-col items-center gap-3">
          <Image
            src="/Mergify-Sign.svg"
            alt="Mergify Sign logo"
            width={132}
            height={32}
            className="h-8 w-auto"
          />
          <h3 className="text-[18px] font-semibold text-[#111827]">
            Send a Signature Request
          </h3>
          <p className="max-w-[420px] text-sm leading-relaxed text-[#4B5563]">
            Get contracts and important documents signed fast, with reminders and completion tracking built in.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenClick}
          disabled={isOpening}
          className="mt-2 inline-flex h-11 items-center justify-center rounded-[8px] bg-[#6A4EE8] px-6 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#5C3EDB] disabled:cursor-not-allowed disabled:opacity-80"
        >
          {isOpening ? (
            <>
              <span
                className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden
              />
              <span>Opening…</span>
            </>
          ) : (
            <>
              <span>Go to Signature Dashboard</span>
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
