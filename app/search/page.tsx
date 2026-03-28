import { getAllPostMeta } from "@/lib/content";
import { ArticleGrid } from "@/components/articles/article-grid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description: "Search all Particle Post articles.",
};

// No-JS fallback search page (the main search is the Cmd+K overlay)
export default function SearchPage() {
  const articles = getAllPostMeta();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-display-lg mb-4">Search</h1>
      <p className="text-text-secondary text-body-md mb-8">
        Press <kbd className="px-2 py-0.5 text-body-xs border border-border-ghost rounded font-mono">Ctrl+K</kbd> to
        open the search overlay, or browse all articles below.
      </p>

      <ArticleGrid
        articles={articles.map((a) => ({
          slug: a.slug,
          title: a.title,
          description: a.description,
          date: a.date,
          readingTime: a.readingTime,
          categories: a.categories,
          coverImage: a.coverImage?.url,
        }))}
        featureFirst={false}
      />
    </div>
  );
}
