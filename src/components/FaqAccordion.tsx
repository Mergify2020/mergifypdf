"use client";

import { useMemo, useState } from "react";
import RevealOnScroll from "@/components/RevealOnScroll";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: FaqItem[];
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

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});
  const ids = useMemo(() => items.map((_, index) => `faq-${index}`), [items]);

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col">
      {items.map((item, index) => {
        const isOpen = !!openItems[index];
        const contentId = `${ids[index]}-content`;
        const buttonId = `${ids[index]}-button`;

        return (
          <RevealOnScroll key={item.question} delayMs={index * 60}>
            <div className="border-b border-slate-200/60 py-4">
              <button
                type="button"
                id={buttonId}
                aria-controls={contentId}
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenItems((current) => ({ ...current, [index]: !current[index] }))
                }
                className="flex w-full items-center justify-between gap-4 text-left text-[15px] font-semibold text-slate-900 outline-none sm:text-base"
              >
                <span>{item.question}</span>
                <span
                  className={`flex h-6 w-6 items-center justify-center transition-colors duration-200 ${
                    isOpen ? "text-slate-700" : "text-slate-400"
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
