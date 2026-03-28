import Link from "next/link";
import Image from "next/image";
import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
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
        "group block bg-bg-container border border-border-ghost rounded-lg overflow-hidden",
        "hover:border-border-hover transition-colors duration-[180ms] ease-kinetic",
        featured && "editorial-stripe md:col-span-2"
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
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-5 space-y-3">
        {/* Category overline + Date */}
        <div className="flex items-center gap-3">
          {categories[0] && <OverlineLabel>{categories[0]}</OverlineLabel>}
          <DataText as="time">{formatDateShort(date)}</DataText>
        </div>

        {/* Title — Sora headline */}
        <h3
          className={cn(
            "font-display font-bold leading-snug text-text-primary",
            "group-hover:text-accent transition-colors duration-[180ms] ease-kinetic",
            featured ? "text-display-sm" : "text-[1.25rem] tracking-[-0.01em]"
          )}
        >
          <span className="line-clamp-2">{title}</span>
        </h3>

        {/* Excerpt — DM Sans */}
        <p className="text-body-sm text-text-secondary line-clamp-2">
          {description}
        </p>

        {/* Footer — IBM Plex Mono metadata */}
        <div className="flex items-center pt-1">
          <ReadingTime minutes={readingTime} />
        </div>
      </div>
    </Link>
  );
}
