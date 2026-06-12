"use client";

import { useMemo, useState } from "react";
import RevealOnScroll from "@/components/RevealOnScroll";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: FaqItem[];
  variant?: "default" | "bristol" | "dark";
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M7 10l5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function PlusIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-45" : ""}`}>
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function FaqAccordion({ items, variant = "default" }: FaqAccordionProps) {
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});
  const ids = useMemo(() => items.map((_, index) => `faq-${index}`), [items]);

  if (variant === "bristol") {
    return (
      <div className="mx-auto mt-8 grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <RevealOnScroll as="div" className="max-w-sm">
          <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#4f46e5]">
            FAQ
          </p>
          <h2 className="mt-3 text-[clamp(2.1rem,4vw,3.6rem)] font-semibold tracking-[-0.05em] text-slate-950">
            Your questions,
            <br />
            answered
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-slate-600">
            Get quick answers to the most common questions about our platform and services.
          </p>
          <a
            href="/support"
            className="mt-7 inline-flex items-center justify-center rounded-full border border-slate-900/20 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition hover:border-slate-900/30 hover:bg-slate-50"
          >
            Contact us
          </a>
        </RevealOnScroll>

        <div className="space-y-3">
          {items.map((item, index) => {
            const isOpen = !!openItems[index];
            const contentId = `${ids[index]}-content`;
            const buttonId = `${ids[index]}-button`;

            return (
              <RevealOnScroll key={item.question} delayMs={index * 60}>
                <div className="rounded-[22px] border border-slate-200/80 bg-[#fbf9f5] px-5 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-shadow duration-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:px-6">
                  <button
                    type="button"
                    id={buttonId}
                    aria-controls={contentId}
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenItems((current) => ({ ...current, [index]: !current[index] }))
                    }
                    className="flex w-full items-center justify-between gap-5 py-4 text-left text-[15px] font-medium leading-6 text-slate-900 outline-none transition-colors duration-200 hover:text-slate-950 sm:py-5 sm:text-base"
                  >
                    <span className="pr-2">{item.question}</span>
                    <span
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all duration-200 ${
                        isOpen ? "border-slate-300 bg-slate-50 text-slate-700" : ""
                      }`}
                    >
                      <PlusIcon open={isOpen} />
                    </span>
                  </button>
                  <div
                    id={contentId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-250 ease-out ${
                      isOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-2xl text-sm leading-7 text-slate-600">{item.answer}</p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === "dark") {
    return (
      <div className="mx-auto mt-8 grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:items-start lg:gap-14">
        <RevealOnScroll as="div" className="max-w-sm lg:pt-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#9d94ff]">
            FAQ
          </p>
          <h2 className="mt-3 text-[clamp(2.1rem,4vw,3.6rem)] font-semibold tracking-[-0.05em] text-white">
            Questions,
            <br />
            answered.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/68">
            Answers to the questions people ask before choosing MergifyPDF.
          </p>
          <a
            href="/support"
            className="mt-7 inline-flex w-fit items-center justify-center rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(139,124,255,0.14)] ring-1 ring-white/10 transition duration-200 hover:-translate-y-[1px] hover:bg-white/14 hover:shadow-[0_16px_30px_rgba(139,124,255,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111125]"
          >
            Contact us
          </a>
        </RevealOnScroll>

        <div className="border-t border-white/10">
          {items.map((item, index) => {
            const isOpen = !!openItems[index];
            const contentId = `${ids[index]}-content`;
            const buttonId = `${ids[index]}-button`;

            return (
              <RevealOnScroll key={item.question} delayMs={index * 80}>
                <div className="border-b border-white/10">
                  <button
                    type="button"
                    id={buttonId}
                    aria-controls={contentId}
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenItems((current) => ({ ...current, [index]: !current[index] }))
                    }
                    className="flex w-full items-center justify-between gap-5 py-5 text-left text-[15px] font-medium leading-6 text-white outline-none transition-colors duration-200 sm:py-6 sm:text-base hover:text-white/95"
                  >
                    <span className="pr-2">{item.question}</span>
                    <span
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-all duration-200 ${
                        isOpen ? "border-[#8b7cff]/30 bg-white/[0.06] text-white" : ""
                      }`}
                    >
                      <PlusIcon open={isOpen} />
                    </span>
                  </button>
                  <div
                    id={contentId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-250 ease-out ${
                      isOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-2xl text-sm leading-7 text-white/68">{item.answer}</p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col">
      {items.map((item, index) => {
        const isOpen = !!openItems[index];
        const contentId = `${ids[index]}-content`;
        const buttonId = `${ids[index]}-button`;

        return (
          <RevealOnScroll key={item.question} delayMs={index * 60}>
            <div className="border-b border-slate-200">
              <button
                type="button"
                id={buttonId}
                aria-controls={contentId}
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenItems((current) => ({ ...current, [index]: !current[index] }))
                }
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold text-slate-900 outline-none transition-colors duration-200 hover:text-slate-950 sm:text-base"
              >
                <span>{item.question}</span>
                <span
                  className={`flex h-6 w-6 items-center justify-center transition-colors duration-200 ${
                    isOpen ? "text-slate-700" : "text-slate-500"
                  }`}
                >
                  <ChevronIcon open={isOpen} />
                </span>
              </button>
              <div
                id={contentId}
                role="region"
                aria-labelledby={buttonId}
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        );
      })}
    </div>
  );
}
