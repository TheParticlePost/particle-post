import { ArticleCard } from "@/components/articles/article-card";
import type { PostMeta } from "@/lib/types";

interface RelatedArticlesProps {
  articles: PostMeta[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <section className="mt-16 pt-8 border-t border-[var(--border)]">
      <h2 className="font-display text-display-sm mb-6">Related Articles</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.map((article) => (
          <ArticleCard
            key={article.slug}
            slug={article.slug}
            title={article.title}
            description={article.description}
            date={article.date}
            readingTime={article.readingTime}
            categories={article.categories}
            coverImage={article.coverImage?.url}
          />
        ))}
      </div>
    </section>
  );
}
