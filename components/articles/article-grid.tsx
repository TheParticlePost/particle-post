import { ArticleCard } from "@/components/articles/article-card";

interface ArticleMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: number;
  categories: string[];
  coverImage?: string;
}

interface ArticleGridProps {
  articles: ArticleMeta[];
  featureFirst?: boolean;
  columns?: 2 | 3;
}

export function ArticleGrid({
  articles,
  featureFirst = true,
  columns = 2,
}: ArticleGridProps) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary text-body-lg">
          No articles found.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        columns === 3
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          : "grid grid-cols-1 md:grid-cols-2 gap-6"
      }
    >
      {articles.map((article, i) => (
        <ArticleCard
          key={article.slug}
          {...article}
          featured={featureFirst && i === 0}
        />
      ))}
    </div>
  );
}
