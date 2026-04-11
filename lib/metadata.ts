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

/**
 * Sanitize a chart id query param before it gets baked into a URL.
 * The article assembler only ever produces `chart-N` (digits) and
 * shortcode id attributes are constrained to that format, but we
 * still validate here as a defense against URL injection.
 */
function sanitizeChartId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, 40);
  if (!/^chart-\d+$/.test(trimmed)) return null;
  return trimmed;
}

export function generatePostMetadata(
  post: PostMeta,
  /** Optional `?chart=<id>` query param. When present and the id is
   *  valid, the OG image is swapped to a dynamic per-chart preview so
   *  LinkedIn / X surface the chart itself instead of the article's
   *  default cover image. */
  chartId?: string | null,
): Metadata {
  const seoTitle = truncateTitle(post.title);

  // If a valid chart id is provided, route LinkedIn/X crawlers to the
  // dynamic OG image endpoint for this chart. Otherwise, use the
  // article's cover image as the default preview.
  const validChartId = sanitizeChartId(chartId);
  const chartOgUrl = validChartId
    ? `${BASE_URL}/api/og/chart?slug=${encodeURIComponent(
        post.slug,
      )}&id=${encodeURIComponent(validChartId)}`
    : null;

  const ogImages = chartOgUrl
    ? [
        {
          url: chartOgUrl,
          alt: `${post.title} — chart`,
          width: 1200,
          height: 630,
        },
      ]
    : post.coverImage
      ? [{ url: post.coverImage.url, alt: post.coverImage.alt }]
      : [];

  const twitterImages = chartOgUrl
    ? [chartOgUrl]
    : post.coverImage
      ? [post.coverImage.url]
      : [];

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
      images: ogImages,
      url: validChartId
        ? `${BASE_URL}/posts/${post.slug}/?chart=${validChartId}`
        : `${BASE_URL}/posts/${post.slug}/`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title, // Full title for social cards
      description: post.description,
      images: twitterImages,
    },
    alternates: {
      // Canonical always points at the bare article URL — the
      // ?chart=<id> variant is a view alias, not a separate page.
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
