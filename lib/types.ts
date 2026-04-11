export interface CoverImage {
  url: string;
  alt?: string;
  photographer?: string;
  photographer_url?: string;
  source?: string;
  source_url?: string;
}

export interface FaqPair {
  question: string;
  answer: string;
}

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  lastmod?: string;
  categories: string[];
  tags: string[];
  readingTime: number;
  coverImage?: CoverImage;
  draft: boolean;
  faq_pairs?: FaqPair[];
  schema_type?: string;
  keywords?: string[];
  /**
   * Stable author slug from lib/authors.ts (e.g. "william-hayes"). The
   * Server Component looks up the full Author profile from the registry
   * to render the byline link. Backfilled across all articles via
   * pipeline/scripts/backfill_authors.py.
   */
  author?: string;
  featured?: boolean;
  /**
   * One of: news_analysis | deep_dive | case_study | how_to |
   * technology_profile | industry_briefing.
   * Used by the author registry to map an article to its default curator
   * when the explicit `author` field is missing.
   */
  content_type?: string;
}

export interface Post extends PostMeta {
  content: string;
}

// CategorySlug is derived from CATEGORIES in lib/utils.ts — import from there
