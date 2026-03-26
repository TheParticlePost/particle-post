import { getAllPostMeta } from "@/lib/content";

export interface SearchIndexItem {
  slug: string;
  title: string;
  description: string;
  categories: string[];
  tags: string[];
  date: string;
}

export function buildSearchIndex(): SearchIndexItem[] {
  const posts = getAllPostMeta();
  return posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    categories: p.categories,
    tags: p.tags,
    date: p.date,
  }));
}
