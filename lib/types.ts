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
  author?: string;
  featured?: boolean;
}

export interface Post extends PostMeta {
  content: string;
}

// CategorySlug is derived from CATEGORIES in lib/utils.ts — import from there
