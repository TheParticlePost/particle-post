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
    title: cat.name,
    description: `Articles about ${cat.name} from Particle Post.`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.slug === category);
  if (!cat) notFound();

  const posts = getPostsByCategory(category);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: cat.color }}
        />
        <h1 className="font-display text-display-lg">{cat.name}</h1>
        <span className="text-body-sm text-foreground-muted ml-2">
          {posts.length} {posts.length === 1 ? "article" : "articles"}
        </span>
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
    </div>
  );
}
