import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { calculateReadingTime } from "@/lib/utils";
import type { Post, PostMeta, CoverImage } from "@/lib/types";

const POSTS_DIR = path.join(process.cwd(), "blog", "content", "posts");

function parseCoverImage(frontmatter: Record<string, unknown>): CoverImage | undefined {
  const cover = frontmatter.cover as Record<string, string> | undefined;
  if (!cover?.image) return undefined;

  return {
    url: cover.image,
    alt: cover.alt || cover.caption || "",
    photographer: (frontmatter.image_credit_name as string) || undefined,
    photographer_url: (frontmatter.image_credit_url as string) || undefined,
    source: (frontmatter.image_credit_source as string) || undefined,
    source_url: undefined,
  };
}

function parsePost(filename: string): Post | null {
  const filePath = path.join(POSTS_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  if (data.draft === true) return null;

  const slug = data.slug || filename.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");

  const post: Post = {
    slug,
    title: data.title || "Untitled",
    description: data.description || "",
    date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
    lastmod: data.lastmod ? new Date(data.lastmod).toISOString() : undefined,
    categories: Array.isArray(data.categories) ? data.categories : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    readingTime: calculateReadingTime(content),
    coverImage: parseCoverImage(data),
    draft: false,
    faq_pairs: Array.isArray(data.faq_pairs)
      ? data.faq_pairs.map((f: Record<string, string>) => ({
          question: f.q || f.question || "",
          answer: f.a || f.answer || "",
        }))
      : undefined,
    schema_type: data.schema_type || "Article",
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    author: data.author || "Particle Post",
    featured: data.featured === true,
    content,
  };

  return post;
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const posts = files
    .map((f) => {
      try {
        return parsePost(f);
      } catch {
        console.error(`Failed to parse ${f}`);
        return null;
      }
    })
    .filter((p): p is Post => p !== null);

  // Sort by date descending
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return posts;
}

export function getAllPostMeta(): PostMeta[] {
  return getAllPosts().map(({ content, ...meta }) => meta);
}

export function getPostBySlug(slug: string): Post | null {
  const posts = getAllPosts();
  return posts.find((p) => p.slug === slug) || null;
}

export function getPostsByCategory(categorySlug: string): PostMeta[] {
  const allMeta = getAllPostMeta();
  return allMeta.filter((post) =>
    post.categories.some((cat) => {
      const slug = cat
        .toLowerCase()
        .replace(/&/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return slug === categorySlug;
    })
  );
}

export function getRelatedPosts(currentSlug: string, limit = 3): PostMeta[] {
  const current = getPostBySlug(currentSlug);
  if (!current) return [];

  const allMeta = getAllPostMeta().filter((p) => p.slug !== currentSlug);

  // Score by shared categories and tags
  const scored = allMeta.map((post) => {
    let score = 0;
    for (const cat of post.categories) {
      if (current.categories.includes(cat)) score += 3;
    }
    for (const tag of post.tags) {
      if (current.tags.includes(tag)) score += 1;
    }
    return { post, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.post);
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}
