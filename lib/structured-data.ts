import type { PostMeta, Post } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://theparticlepost.com";

export function generateArticleJsonLd(post: PostMeta | Post) {
  const schemaType = post.schema_type || "Article";
  const jsonLdType = schemaType === "HowTo"
    ? "HowTo"
    : schemaType === "NewsArticle"
      ? "NewsArticle"
      : "Article";

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": jsonLdType,
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
        url: `${BASE_URL}/favicon-32x32.png`,
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

  // HowTo schema: extract steps from numbered headings in content
  if (jsonLdType === "HowTo" && "content" in post && post.content) {
    const steps = extractHowToSteps(post.content);
    if (steps.length > 0) {
      jsonLd.step = steps.map((step, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: step.name,
        text: step.text,
      }));
    }
  }

  return jsonLd;
}

/**
 * Extract HowTo steps from article content.
 * Looks for patterns like "## Step 1: ...", "## 1. ...", or numbered H2s.
 */
function extractHowToSteps(
  content: string
): { name: string; text: string }[] {
  const steps: { name: string; text: string }[] = [];
  // Match H2 headings that look like steps
  const stepPattern = /^##\s+(?:Step\s+\d+[:\s]*|(\d+)\.\s*)(.+)/gim;
  const lines = content.split("\n");
  let currentStep: { name: string; textLines: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(/^##\s+(?:Step\s+\d+[:\s]*|\d+\.\s*)(.+)/i);
    if (match) {
      // Save previous step
      if (currentStep) {
        steps.push({
          name: currentStep.name,
          text: currentStep.textLines.join(" ").trim().slice(0, 200),
        });
      }
      currentStep = { name: match[1].trim(), textLines: [] };
    } else if (currentStep && line.trim() && !line.startsWith("#")) {
      currentStep.textLines.push(line.trim());
    }
  }
  // Save last step
  if (currentStep) {
    steps.push({
      name: currentStep.name,
      text: currentStep.textLines.join(" ").trim().slice(0, 200),
    });
  }

  return steps;
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
