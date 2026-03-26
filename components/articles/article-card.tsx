import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ReadingTime } from "@/components/articles/reading-time";
import { formatDateShort } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ArticleCardProps {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: number;
  categories: string[];
  coverImage?: string;
  featured?: boolean;
}

export function ArticleCard({
  slug,
  title,
  description,
  date,
  readingTime,
  categories,
  coverImage,
  featured = false,
}: ArticleCardProps) {
  return (
    <Link
      href={`/posts/${slug}/`}
      className={cn(
        "group block glass-card overflow-hidden",
        "hover:border-[var(--border-hover)] hover:shadow-card-hover",
        "transition-all duration-300",
        featured && "md:col-span-2"
      )}
    >
      {/* Image */}
      {coverImage && (
        <div
          className={cn(
            "relative overflow-hidden",
            featured ? "aspect-[2.2/1]" : "aspect-[1.8/1]"
          )}
        >
          <Image
            src={coverImage}
            alt={title}
            fill
            sizes={featured ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/60 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="p-5 space-y-3">
        {/* Category + Date */}
        <div className="flex items-center gap-3">
          {categories[0] && <Badge category={categories[0]} />}
          <span className="text-body-xs text-foreground-muted">
            {formatDateShort(date)}
          </span>
        </div>

        {/* Title */}
        <h3
          className={cn(
            "font-display leading-snug group-hover:text-accent transition-colors duration-200",
            featured ? "text-display-sm" : "text-[1.25rem]"
          )}
        >
          <span className="line-clamp-2">{title}</span>
        </h3>

        {/* Excerpt */}
        <p className="text-body-sm text-foreground-secondary line-clamp-2">
          {description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <ReadingTime minutes={readingTime} />
          <span className="text-body-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Read more &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
