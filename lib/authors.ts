/**
 * Author registry — the human curators behind Particle Post.
 *
 * Articles get assigned to a curator deterministically by `content_type`,
 * via `getAuthorForContentType()`. The article frontmatter `author` field
 * stores the slug; rendering looks up the full profile here.
 *
 * Replace these placeholder profiles with real curators as the team grows.
 * The slugs are stable identifiers — keep them URL-safe and don't rename
 * after articles have shipped (frontmatter would need backfilling).
 */

export type ContentType =
  | "news_analysis"
  | "deep_dive"
  | "case_study"
  | "how_to"
  | "technology_profile"
  | "industry_briefing";

export type Author = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  avatar: string;
  expertise: string[];
  email?: string;
  /**
   * Content types this curator owns by default. Used by the writer pipeline
   * to assign authorship without prompting the LLM, and by the backfill
   * script to retroactively label existing articles.
   */
  defaultFor: ContentType[];
};

export const AUTHORS: Author[] = [
  {
    slug: "william-hayes",
    name: "William Hayes",
    role: "Editor-in-Chief",
    bio: "William founded Particle Post to help business leaders cut through AI hype with research-grade analysis. Former operator and investor focused on enterprise AI implementation.",
    avatar: "/authors/william-hayes.svg",
    expertise: ["AI Strategy", "Enterprise Implementation", "Operations"],
    email: "william@theparticlepost.com",
    defaultFor: ["news_analysis", "industry_briefing"],
  },
  {
    slug: "marie-tremblay",
    name: "Marie Tremblay",
    role: "Research Lead",
    bio: "Marie leads in-depth research for Particle Post's deep dives and case studies. Background in financial economics and corporate strategy, with a focus on how AI is reshaping capital allocation.",
    avatar: "/authors/marie-tremblay.svg",
    expertise: ["Financial AI", "Deep Research", "Case Studies"],
    defaultFor: ["deep_dive", "case_study"],
  },
  {
    slug: "alex-park",
    name: "Alex Park",
    role: "Implementation Editor",
    bio: "Alex covers practical AI deployment — from technology profiles to step-by-step how-tos for operators who need to ship something this quarter, not next year.",
    avatar: "/authors/alex-park.svg",
    expertise: ["AI Tools", "Implementation Guides", "Technology Profiles"],
    defaultFor: ["how_to", "technology_profile"],
  },
];

/** Look up a curator by their stable slug. Returns undefined if not found. */
export function getAuthorBySlug(slug: string): Author | undefined {
  return AUTHORS.find((a) => a.slug === slug);
}

/**
 * Deterministically assign a curator to a content type. Falls back to the
 * first author in the registry if the content type doesn't match any
 * `defaultFor` rule — defensive against future content types being added
 * without an owner.
 */
export function getAuthorForContentType(contentType: string): Author {
  const match = AUTHORS.find((a) =>
    a.defaultFor.some((t) => t === contentType)
  );
  return match ?? AUTHORS[0];
}

/** All author slugs — used by sitemap + generateStaticParams. */
export function getAllAuthorSlugs(): string[] {
  return AUTHORS.map((a) => a.slug);
}
