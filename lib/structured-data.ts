import type { PostMeta } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://theparticlepost.com";

export function generateArticleJsonLd(post: PostMeta) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.lastmod || post.date,
    author: {
      "@type": "Organization",
      name: "Particle Post",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Particle Post",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/favicon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/posts/${post.slug}/`,
    },
    keywords: post.keywords?.join(", "),
  };

  if (post.coverImage) {
    jsonLd.image = {
      "@type": "ImageObject",
      url: post.coverImage.url,
    };
  }

  return jsonLd;
}

export function generateFaqJsonLd(post: PostMeta) {
  if (!post.faq_pairs || post.faq_pairs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faq_pairs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function generateBreadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
