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
   * Stable author slug from lib/authors.ts (e.g. "william-morin"). The
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
  /**
   * 50-75 word "In brief" summary rendered above the cover image. Mandatory
   * for articles published after 2026-04-11; backfilled for older articles
   * via pipeline/scripts/backfill_executive_summaries.py. The article page
   * conditionally renders <ExecutiveSummary> only if this field is present
   * so legacy articles still render cleanly.
   */
  executive_summary?: string;
}

export interface Post extends PostMeta {
  content: string;
}

// CategorySlug is derived from CATEGORIES in lib/utils.ts — import from there
