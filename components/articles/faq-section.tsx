"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FaqPair } from "@/lib/types";

interface FaqSectionProps {
  faqs: FaqPair[];
}

export function FaqSection({ faqs }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-border-ghost">
      <h2 className="font-display text-display-sm mb-6">
        Frequently Asked Questions
      </h2>
      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="rounded-lg border border-border-ghost overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left
                         hover:bg-bg-high/30 transition-colors duration-200"
              aria-expanded={openIndex === i}
            >
              <span className="text-body-md font-medium pr-4">{faq.question}</span>
              <svg
                className={cn(
                  "w-5 h-5 shrink-0 text-text-muted transition-transform duration-200",
                  openIndex === i && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                openIndex === i ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="px-5 pb-4 text-body-md text-text-secondary leading-relaxed">
                {faq.answer}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
