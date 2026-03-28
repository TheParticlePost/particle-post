"use client";

import { useState, useMemo } from "react";
import { CategoryTabs } from "@/components/articles/category-tabs";
import { ArticleGrid } from "@/components/articles/article-grid";
import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
import { slugify } from "@/lib/utils";
import type { PostMeta } from "@/lib/types";

interface HomeContentProps {
  articles: PostMeta[];
}

export function HomeContent({ articles }: HomeContentProps) {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(() => {
    if (activeCategory === "all") return articles;
    return articles.filter((a) =>
      a.categories.some((cat) => slugify(cat) === activeCategory)
    );
  }, [articles, activeCategory]);

  return (
    <div className="max-w-container mx-auto px-4 sm:px-6">
      {/* Hero — left-aligned per DESIGN.md */}
      <section className="py-16 sm:py-24">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse-dot" />
          <OverlineLabel>Live Feed</OverlineLabel>
        </div>
        <h1 className="font-display text-display-hero text-text-primary mb-4 max-w-3xl">
          Particle Post
        </h1>
        <p className="text-text-secondary text-body-lg max-w-xl">
          AI-powered insights at the intersection of finance, technology, and
          energy.
        </p>
        <DataText as="p" className="mt-6 uppercase tracking-widest text-text-muted">
          Join 12,000+ leaders. Free. Twice daily.
        </DataText>
      </section>

      {/* Filters */}
      <section className="mb-8">
        <CategoryTabs
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      </section>

      {/* Articles */}
      <section className="pb-16">
        <ArticleGrid
          articles={filtered.map((a) => ({
            slug: a.slug,
            title: a.title,
            description: a.description,
            date: a.date,
            readingTime: a.readingTime,
            categories: a.categories,
            coverImage: a.coverImage?.url,
          }))}
          featureFirst={activeCategory === "all"}
        />
      </section>
    </div>
  );
}
