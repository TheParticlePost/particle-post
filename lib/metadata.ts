import type { Metadata } from "next";
import type { PostMeta } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://theparticlepost.com";

export function generatePostMetadata(post: PostMeta): Metadata {
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author || "Particle Post" }],
    openGraph: {
      title: post.title,
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
      title: post.title,
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
