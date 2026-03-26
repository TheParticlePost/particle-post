import type { MetadataRoute } from "next";
import { getAllPostMeta } from "@/lib/content";
import { CATEGORIES } from "@/lib/utils";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://theparticlepost.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPostMeta();

  const postEntries = posts.map((post) => ({
    url: `${BASE_URL}/posts/${post.slug}/`,
    lastModified: post.lastmod || post.date,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryEntries = CATEGORIES.map((cat) => ({
    url: `${BASE_URL}/categories/${cat.slug}/`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/about/`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/categories/`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/search/`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${BASE_URL}/privacy/`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms/`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/cookies/`, changeFrequency: "yearly", priority: 0.2 },
    ...categoryEntries,
    ...postEntries,
  ];
}
