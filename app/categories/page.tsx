import Link from "next/link";
import { CATEGORIES } from "@/lib/utils";
import { getPostsByCategory } from "@/lib/content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse articles by topic: AI & Finance, Risk & Compliance, Enterprise Tech, and Energy & ESG.",
};

export default function CategoriesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-display-lg mb-8">Categories</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => {
          const posts = getPostsByCategory(cat.slug);
          return (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}/`}
              className="group bg-bg-container border border-border-ghost rounded-lg p-6 hover:border-border-hover transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <h2 className="font-display text-display-sm group-hover:text-accent transition-colors">
                  {cat.name}
                </h2>
              </div>
              <p className="text-body-sm text-text-muted">
                {posts.length} {posts.length === 1 ? "article" : "articles"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
