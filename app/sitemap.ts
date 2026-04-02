import type { MetadataRoute } from "next";
import { getAllPostMeta } from "@/lib/content";
import { CATEGORIES } from "@/lib/utils";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://theparticlepost.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPostMeta();
  const now = new Date().toISOString();

  // Most recent post date for pages that update with new content
  const latestPostDate = posts[0]?.date || now;

  const postEntries = posts.map((post) => ({
    url: `${BASE_URL}/posts/${post.slug}/`,
    lastModified: post.lastmod || post.date,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Derive lastModified for category pages from newest post in each category
  const categoryEntries = CATEGORIES.map((cat) => {
    const newest = posts.find((p) =>
      p.categories.some(
        (c) =>
          c.toLowerCase().replace(/&/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") ===
          cat.slug
      )
    );
    return {
      url: `${BASE_URL}/categories/${cat.slug}/`,
      lastModified: newest?.date || now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    };
  });

  return [
    { url: `${BASE_URL}/`, lastModified: latestPostDate, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/about/`, lastModified: "2025-01-01", changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/categories/`, lastModified: latestPostDate, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/search/`, lastModified: latestPostDate, changeFrequency: "weekly", priority: 0.4 },
    { url: `${BASE_URL}/privacy/`, lastModified: "2025-01-01", changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms/`, lastModified: "2025-01-01", changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/cookies/`, lastModified: "2025-01-01", changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/subscribe/`, lastModified: "2025-01-01", changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/archive/`, lastModified: latestPostDate, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/pulse/`, lastModified: latestPostDate, changeFrequency: "daily", priority: 0.8 },
    ...categoryEntries,
    ...postEntries,
  ];
}
