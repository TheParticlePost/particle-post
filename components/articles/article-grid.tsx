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
}

export function ArticleGrid({
  articles,
  featureFirst = true,
}: ArticleGridProps) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-foreground-secondary text-body-lg">
          No articles found.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
