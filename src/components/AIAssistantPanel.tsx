"use client";

import { useState } from "react";
import { ArrowUp, ChevronDown, ChevronUp } from "lucide-react";

type AIAssistantPanelProps = {
  className?: string;
};

export default function AIAssistantPanel({ className }: AIAssistantPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [expanded, setExpanded] = useState(true);
  const collapsedHeight = 96;

  return (
    <div
      className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.12)] bg-clip-padding [--ai-grad-1:#38BDF8] [--ai-grad-2:#6366F1] [--ai-grad-3:#A78BFA] dark:bg-zinc-950 dark:shadow-none dark:[background-image:radial-gradient(140%_100%_at_8%_0%,rgba(76,110,255,0.18),rgba(0,0,0,0)_55%)] dark:[--ai-grad-1:#7DD3FC] dark:[--ai-grad-2:#818CF8] dark:[--ai-grad-3:#C4B5FD] ${className ?? ""}`}
      style={{
        height: expanded ? "100%" : `${collapsedHeight}px`,
        transition: "height 180ms ease",
      }}
      onClick={() => {
        if (!expanded) setExpanded(true);
      }}
      role={!expanded ? "button" : undefined}
      tabIndex={!expanded ? 0 : -1}
      onKeyDown={(event) => {
        if (!expanded && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          setExpanded(true);
        }
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#F2E6EE] to-[#977DFF] opacity-100 dark:from-[#0B0F1F] dark:via-[#111827] dark:to-[#0B0F1F] transition-colors duration-200 ease-out" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 rounded-xl border-2 border-[#6D28D9] dark:border-[#4338CA]/70 transition-colors duration-200 ease-out"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-100 dark:bg-[radial-gradient(70%_60%_at_80%_20%,rgba(99,102,241,0.35),rgba(0,0,0,0)_70%)] transition-opacity duration-200 ease-out" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-white/60 dark:bg-[#0B0F1F]/25 transition-colors duration-200 ease-out" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0)_45%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.85),rgba(15,23,42,0)_55%)] transition-colors duration-200 ease-out" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-center gap-1">
          <svg className="-mt-1 -ml-1.5 h-10 w-10" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M10.5 2l1.7 4.4 4.6 1.1-4.6 1.1-1.7 4.4-1.7-4.4-4.6-1.1 4.6-1.1L10.5 2z"
            fill="url(#aiRainbowGradient)"
          />
          <path
            d="M18.5 12.5l.9 2.3 2.4.6-2.4.6-.9 2.3-.9-2.3-2.4-.6 2.4-.6.9-2.3z"
            fill="url(#aiRainbowGradient)"
          />
          </svg>
          <svg width="0" height="0" aria-hidden="true">
            <defs>
              <linearGradient id="aiRainbowGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--ai-grad-1)" />
                <stop offset="50%" stopColor="var(--ai-grad-2)" />
                <stop offset="100%" stopColor="var(--ai-grad-3)" />
              </linearGradient>
            </defs>
          </svg>
          <p className="text-base font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-[#6366F1] to-[#A78BFA] dark:from-[#7DD3FC] dark:via-[#818CF8] dark:to-[#C4B5FD]">
            AI Assistant
          </p>
          {expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-[#4F46E5] transition hover:bg-[#4F46E5]/10 dark:text-zinc-200 dark:hover:bg-zinc-700/40"
              aria-label="Collapse AI assistant panel"
            >
            <ChevronUp className="h-5 w-5" aria-hidden />
          </button>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-[#6366F1] to-[#A78BFA] dark:from-[#7DD3FC] dark:via-[#818CF8] dark:to-[#C4B5FD]">
          Get help with documents & signatures.
        </p>
      </div>

      <div
        className={`relative mt-3 flex min-h-0 flex-1 items-center justify-center text-center text-xs text-[#475569] transition-opacity duration-150 dark:text-zinc-300 ${
          expanded ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!expanded}
      />
      <div className={`h-3 ${expanded ? "hidden" : "block"}`} aria-hidden="true" />

      <div
        className={`relative mt-3 transition-opacity duration-150 ${
          expanded ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!expanded}
      >
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask anything..."
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            className="h-10 w-full rounded-full border border-[#E5E7EB] bg-white px-4 pr-11 text-sm text-[#1F2A37] shadow-[0_6px_14px_rgba(15,23,42,0.12)] dark:shadow-none placeholder:text-[#64748B] placeholder:font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 dark:border-[#3730A3] dark:bg-[#0B0F1F]/70 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:ring-[#818CF8]/40"
          />
          <button
            type="button"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#1F2937] text-white transition hover:bg-[#334155] active:scale-[0.98] dark:border-[#4338CA] dark:bg-[#4338CA] dark:text-white dark:hover:bg-[#4F46E5]"
            aria-label="Send message"
          >
            <ArrowUp className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
