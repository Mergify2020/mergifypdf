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
      className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.12)] bg-clip-padding ${className ?? ""}`}
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
      <div className="absolute inset-0 bg-gradient-to-b from-[#F2E6EE] to-[#977DFF] opacity-100" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 rounded-xl border-2 border-[#6D28D9]"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-white/60" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0)_45%)]" aria-hidden="true" />
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
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="50%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
          </svg>
          <p className="text-base font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-[#6366F1] to-[#A78BFA]">
            AI Assistant
          </p>
          {expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-[#4F46E5] transition hover:bg-[#4F46E5]/10"
              aria-label="Collapse AI assistant panel"
            >
            <ChevronUp className="h-5 w-5" aria-hidden />
          </button>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-[#6366F1] to-[#A78BFA]">
          Get help with documents & signatures.
        </p>
      </div>

      <div
        className={`relative mt-3 flex min-h-0 flex-1 items-center justify-center text-center text-xs text-[#475569] transition-opacity duration-150 ${
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
            className="h-10 w-full rounded-full border border-[#E5E7EB] bg-white px-4 pr-11 text-sm text-[#1F2A37] shadow-[0_6px_14px_rgba(15,23,42,0.12)] placeholder:text-[#64748B] placeholder:font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40"
          />
          <button
            type="button"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#1F2937] text-white transition hover:bg-[#334155] active:scale-[0.98]"
            aria-label="Send message"
          >
            <ArrowUp className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
