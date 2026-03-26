"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Fuse from "fuse.js";
import { cn, formatDateShort } from "@/lib/utils";
import type { SearchIndexItem } from "@/lib/search";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchIndexItem[]>([]);
  const [index, setIndex] = useState<SearchIndexItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fuseRef = useRef<Fuse<SearchIndexItem> | null>(null);
  const router = useRouter();

  // Load search index
  useEffect(() => {
    if (isOpen && index.length === 0) {
      fetch("/api/search-index/")
        .then((r) => r.json())
        .then((data: SearchIndexItem[]) => {
          setIndex(data);
          fuseRef.current = new Fuse(data, {
            keys: [
              { name: "title", weight: 3 },
              { name: "description", weight: 2 },
              { name: "categories", weight: 1 },
              { name: "tags", weight: 1 },
            ],
            threshold: 0.35,
            includeScore: true,
          });
        })
        .catch(console.error);
    }
  }, [isOpen, index.length]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Search
  const search = useCallback(
    (q: string) => {
      setQuery(q);
      setActiveIndex(0);
      if (!q.trim() || !fuseRef.current) {
        setResults([]);
        return;
      }
      const hits = fuseRef.current.search(q, { limit: 8 });
      setResults(hits.map((h) => h.item));
    },
    []
  );

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[activeIndex]) {
        router.push(`/posts/${results[activeIndex].slug}/`);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, results, activeIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm"
        onClick={onClose}
        role="button"
        aria-label="Close search"
        tabIndex={-1}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl mx-4 glass-card shadow-card-hover animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Search articles"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <svg className="w-5 h-5 text-foreground-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Search articles..."
            aria-label="Search articles"
            aria-autocomplete="list"
            aria-controls="search-results"
            className="flex-1 bg-transparent text-body-md text-foreground placeholder:text-foreground-muted outline-none"
          />
          <kbd className="hidden sm:inline-flex px-2 py-0.5 text-body-xs text-foreground-muted border border-[var(--border)] rounded">
            Esc
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul id="search-results" role="listbox" className="max-h-80 overflow-y-auto py-2">
            {results.map((item, i) => (
              <li key={item.slug} role="option" aria-selected={i === activeIndex}>
                <Link
                  href={`/posts/${item.slug}/`}
                  onClick={onClose}
                  className={cn(
                    "block px-5 py-3 transition-colors duration-100",
                    i === activeIndex
                      ? "bg-accent/10 text-accent"
                      : "hover:bg-bg-tertiary/50"
                  )}
                >
                  <p className="text-body-md font-medium line-clamp-1">
                    {item.title}
                  </p>
                  <p className="text-body-xs text-foreground-muted line-clamp-1 mt-0.5">
                    {item.description}
                  </p>
                  <p className="text-body-xs text-foreground-muted mt-1">
                    {formatDateShort(item.date)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state */}
        {query && results.length === 0 && (
          <div className="px-5 py-8 text-center text-foreground-muted text-body-sm">
            No results found for &quot;{query}&quot;
          </div>
        )}

        {/* Hint */}
        {!query && (
          <div className="px-5 py-6 text-center text-foreground-muted text-body-sm">
            Start typing to search articles
          </div>
        )}
      </div>
    </div>
  );
}
