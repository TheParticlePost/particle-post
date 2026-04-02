import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES } from "@/lib/utils";
import { getPostsByCategory } from "@/lib/content";
import { ArticleGrid } from "@/components/articles/article-grid";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.slug === category);
  if (!cat) return {};
  return {
    title: `${cat.name} Articles`,
    description: cat.description,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.slug === category);
  if (!cat) notFound();

  const posts = getPostsByCategory(category);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: cat.color }}
          />
          <h1 className="font-display text-display-lg">{cat.name}</h1>
          <span className="text-body-sm font-mono text-text-muted ml-2">
            {posts.length} {posts.length === 1 ? "article" : "articles"}
          </span>
        </div>
        <p className="text-body-base text-text-muted max-w-prose">
          {cat.description}
        </p>
      </div>

      <ArticleGrid
        articles={posts.map((a) => ({
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

      {/* Cross-links to other categories */}
      <nav className="mt-16 pt-8 border-t border-border-ghost" aria-label="Browse other categories">
        <p className="font-mono text-data text-text-muted uppercase tracking-widest mb-4">
          More Categories
        </p>
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.filter((c) => c.slug !== category).map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}/`}
              className="px-4 py-2 rounded-lg bg-bg-container border border-border-ghost text-body-sm text-text-secondary hover:border-accent hover:text-accent transition-colors duration-[180ms]"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
