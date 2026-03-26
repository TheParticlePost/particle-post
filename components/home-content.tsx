"use client";

import { useState, useMemo } from "react";
import { CategoryTabs } from "@/components/articles/category-tabs";
import { ArticleGrid } from "@/components/articles/article-grid";
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Hero */}
      <section className="py-16 sm:py-24 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse-dot" />
          <p className="text-body-sm font-mono text-accent uppercase tracking-widest">
            Live Feed
          </p>
        </div>
        <h1 className="font-display text-display-xl mb-4">
          Particle Post
        </h1>
        <p className="text-foreground-secondary text-body-lg max-w-lg mx-auto">
          AI-powered insights at the intersection of finance, technology, and
          energy.
        </p>
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
