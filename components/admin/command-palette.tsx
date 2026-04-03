"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ItemType = "post" | "keyword" | "competitor" | "outreach" | "affiliate";

interface SearchItem {
  type: ItemType;
  title: string;
  subtitle: string;
  href: string;
}

interface GroupedResults {
  label: string;
  type: ItemType;
  items: SearchItem[];
}

/* ------------------------------------------------------------------ */
/*  Icons (inline SVGs — 16x16)                                        */
/* ------------------------------------------------------------------ */

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2h5.5L13 5.5V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="m10 10 3.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="5" r="2.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="M2 13c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="11" cy="5.5" r="1.75" stroke="currentColor" strokeWidth="1.25" />
      <path d="M11.5 9c1.66 0 3 1.34 3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3.5" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.25" />
      <path d="m2 4.5 6 4 6-4" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 4v8M6 6.5c0-.83.67-1.5 1.5-1.5h1c.83 0 1.5.67 1.5 1.5S9.33 8 8.5 8h-1C6.67 8 6 8.67 6 9.5S6.67 11 7.5 11h1c.83 0 1.5-.67 1.5-1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

const TYPE_CONFIG: Record<ItemType, { label: string; Icon: typeof DocumentIcon }> = {
  post: { label: "Posts", Icon: DocumentIcon },
  keyword: { label: "Keywords", Icon: SearchIcon },
  competitor: { label: "Competitors", Icon: UsersIcon },
  outreach: { label: "Outreach", Icon: MailIcon },
  affiliate: { label: "Affiliates", Icon: DollarIcon },
};

const GROUP_ORDER: ItemType[] = ["post", "keyword", "competitor", "outreach", "affiliate"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch items from API
  const fetchItems = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/admin/search${params}`);
      if (res.ok) {
        const data = await res.json();
        setAllItems(data.items ?? []);
      }
    } catch {
      // Network error — keep existing items
    } finally {
      setLoading(false);
    }
  }, []);

  // Open/close with CMD+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus input when opened; fetch initial items
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      fetchItems("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, fetchItems]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchItems(query), 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, open, fetchItems]);

  // Client-side fuzzy filter with Fuse.js
  const fuse = new Fuse(allItems, {
    keys: ["title", "subtitle"],
    threshold: 0.4,
    includeScore: true,
  });

  const filtered = query.trim()
    ? fuse.search(query).map((r) => r.item)
    : allItems;

  // Group results by type
  const groups: GroupedResults[] = GROUP_ORDER
    .map((type) => ({
      label: TYPE_CONFIG[type].label,
      type,
      items: filtered.filter((item) => item.type === type),
    }))
    .filter((g) => g.items.length > 0);

  // Flat list for keyboard navigation
  const flatItems = groups.flatMap((g) => g.items);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);

  // Keyboard navigation
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && flatItems[activeIndex]) {
      e.preventDefault();
      navigate(flatItems[activeIndex]);
    }
  }

  function navigate(item: SearchItem) {
    setOpen(false);
    router.push(item.href);
  }

  // Scroll active item into view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 bg-bg-container border border-border-ghost rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-ghost">
          <SearchIcon className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, keywords, competitors..."
            className={cn(
              "flex-1 bg-transparent text-body-sm text-text-primary",
              "placeholder:text-text-muted outline-none"
            )}
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-border-ghost text-body-xs text-text-muted font-mono">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {loading && flatItems.length === 0 && (
            <p className="px-4 py-6 text-body-sm text-text-muted text-center">
              Searching...
            </p>
          )}

          {!loading && flatItems.length === 0 && (
            <p className="px-4 py-6 text-body-sm text-text-muted text-center">
              No results found
            </p>
          )}

          {groups.map((group) => (
            <div key={group.type}>
              {/* Group header */}
              <div className="px-4 py-1.5 text-body-xs font-medium text-text-muted uppercase tracking-wider">
                {group.label}
              </div>

              {/* Group items */}
              {group.items.map((item) => {
                flatIndex++;
                const idx = flatIndex;
                const isActive = idx === activeIndex;
                const { Icon } = TYPE_CONFIG[item.type];

                return (
                  <button
                    key={`${item.type}-${item.title}-${idx}`}
                    data-index={idx}
                    onClick={() => navigate(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "flex items-start gap-3 w-full px-4 py-2 text-left",
                      "transition-colors duration-[180ms]",
                      isActive ? "bg-accent/10" : "hover:bg-bg-high"
                    )}
                  >
                    <Icon className="text-text-muted mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm text-text-primary truncate">
                        {item.title}
                      </p>
                      <p className="text-body-xs text-text-muted truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border-ghost">
          <span className="text-body-xs text-text-muted">
            Navigate with <kbd className="font-mono">↑↓</kbd> &middot; Select with <kbd className="font-mono">↵</kbd>
          </span>
          <span className="text-body-xs text-text-muted font-mono">
            {flatItems.length} result{flatItems.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
