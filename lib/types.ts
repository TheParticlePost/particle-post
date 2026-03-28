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
}

export interface Post extends PostMeta {
  content: string;
}

export type CategorySlug = "ai-strategy" | "implementation" | "operations-finance" | "risk-governance" | "industry-signals";
