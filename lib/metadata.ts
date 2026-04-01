import type { Metadata } from "next";
import type { PostMeta } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://theparticlepost.com";

// Suffix added by layout.tsx template: " | Particle Post" (17 chars)
const TITLE_SUFFIX_LEN = " | Particle Post".length;
const MAX_TITLE_TAG = 60;

/** Truncate title so the full <title> tag (with suffix) stays under 60 chars. */
function truncateTitle(title: string): string {
  const maxLen = MAX_TITLE_TAG - TITLE_SUFFIX_LEN;
  if (title.length <= maxLen) return title;
  // Cut at last word boundary before maxLen, add ellipsis
  const trimmed = title.slice(0, maxLen - 1).replace(/\s+\S*$/, "");
  return trimmed + "\u2026";
}

export function generatePostMetadata(post: PostMeta): Metadata {
  const seoTitle = truncateTitle(post.title);
  return {
    title: seoTitle,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author || "Particle Post" }],
    openGraph: {
      title: post.title, // Full title for social cards (no char limit)
      description: post.description,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.lastmod,
      authors: [post.author || "Particle Post"],
      tags: post.tags,
      images: post.coverImage
        ? [{ url: post.coverImage.url, alt: post.coverImage.alt }]
        : [],
      url: `${BASE_URL}/posts/${post.slug}/`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title, // Full title for social cards
      description: post.description,
      images: post.coverImage ? [post.coverImage.url] : [],
    },
    alternates: {
      canonical: `${BASE_URL}/posts/${post.slug}/`,
    },
  };
}

export function generatePageMetadata(
  title: string,
  description: string,
  path: string
): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}${path}`,
    },
    alternates: {
      canonical: `${BASE_URL}${path}`,
    },
  };
}
