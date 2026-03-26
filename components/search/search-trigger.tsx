"use client";

import { useState, useEffect } from "react";
import { SearchOverlay } from "@/components/search/search-overlay";

export function SearchTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-lg flex items-center justify-center
                   text-foreground-secondary hover:text-foreground
                   hover:bg-bg-tertiary/50 transition-all duration-200"
        aria-label="Search (Ctrl+K)"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>

      <SearchOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
