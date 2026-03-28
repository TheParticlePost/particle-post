"use client";

import { useState, useMemo } from "react";
import { FilterPill } from "@/components/ui/filter-pill";
import { ArticleGrid } from "@/components/articles/article-grid";
import { Button } from "@/components/ui/button";
import { OverlineLabel } from "@/components/ui/overline-label";
import { FadeUp } from "@/components/effects/fade-up";
import { slugify } from "@/lib/utils";

const FILTERS = [
  { slug: "all", label: "All" },
  { slug: "ai-finance", label: "AI & Finance" },
  { slug: "risk-compliance", label: "Risk & Compliance" },
  { slug: "enterprise-tech", label: "Enterprise Tech" },
  { slug: "energy-esg", label: "Energy & ESG" },
];

interface ArticleMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: number;
  categories: string[];
  coverImage?: string;
}

interface ArchiveContentProps {
  articles: ArticleMeta[];
}

const PAGE_SIZE = 9;

export function ArchiveContent({ articles }: ArchiveContentProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let result = articles;

    if (activeFilter !== "all") {
      result = result.filter((a) =>
        a.categories.some((cat) => slugify(cat) === activeFilter)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [articles, activeFilter, searchQuery]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="max-w-container mx-auto px-4 sm:px-6">
      {/* Header */}
      <FadeUp>
        <section className="py-16">
          <h1 className="font-display text-display-xl text-text-primary mb-3">
            Archive
          </h1>
          <p className="text-body-lg text-text-secondary">
            Every morning and evening briefing, searchable.
          </p>
        </section>
      </FadeUp>

      {/* Filter Bar */}
      <FadeUp delay={0.05}>
        <section className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 flex-1">
            {FILTERS.map((f) => (
              <FilterPill
                key={f.slug}
                active={activeFilter === f.slug}
                onClick={() => {
                  setActiveFilter(f.slug);
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                {f.label}
              </FilterPill>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search archives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-bg-high border border-border-ghost rounded-lg px-4 py-2.5 text-body-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none w-full sm:w-64 transition-colors duration-[180ms]"
          />
        </section>
      </FadeUp>

      {/* Article Grid — 3 columns */}
      <FadeUp delay={0.1}>
        <section className="pb-12">
          <ArticleGrid
            articles={visible}
            featureFirst={activeFilter === "all"}
            columns={3}
          />
        </section>
      </FadeUp>

      {/* Load More */}
      {hasMore && (
        <FadeUp delay={0.15}>
          <div className="flex justify-center pb-16">
            <Button
              variant="ghost"
              size="default"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Load More
            </Button>
          </div>
        </FadeUp>
      )}
    </div>
  );
}
