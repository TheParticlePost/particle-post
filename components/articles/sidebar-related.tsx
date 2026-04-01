import Link from "next/link";
import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
import type { PostMeta } from "@/lib/types";

interface SidebarRelatedProps {
  articles: PostMeta[];
}

export function SidebarRelated({ articles }: SidebarRelatedProps) {
  if (articles.length === 0) return null;

  return (
    <div className="mb-8">
      <OverlineLabel className="mb-4 block">Related Articles</OverlineLabel>
      <div className="space-y-4">
        {articles.slice(0, 3).map((article) => (
          <Link
            key={article.slug}
            href={`/posts/${article.slug}/`}
            aria-label={article.title}
            className="block editorial-stripe pl-4 py-2 hover:border-l-accent transition-colors duration-[180ms] ease-kinetic group"
          >
            <p className="text-body-sm text-text-primary font-medium leading-snug group-hover:text-accent transition-colors duration-[180ms]">
              {article.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <DataText className="text-caption">{article.readingTime} min</DataText>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
