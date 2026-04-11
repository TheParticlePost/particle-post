import { getAllPosts } from "@/lib/content";
import { HomeContent } from "@/components/home-content";
import { getSubscriberCount } from "@/lib/subscribers/count";
import type { Post, PostMeta } from "@/lib/types";

// Revalidate hourly as a safety net. Vercel rebuilds on every push
// from the pipeline anyway, so ISR here just catches any data that
// changes outside of a deploy (e.g. the subscriber count).
export const revalidate = 3600;

function toMeta(post: { content: string } & PostMeta): PostMeta {
  const { content, ...meta } = post;
  return meta;
}

/**
 * Pick the recommended "Deep Dive" card shown at the bottom of the home
 * page. Not the arbitrary longest-reading-time article — an editorial
 * recommendation.
 *
 * Priority:
 *   1. An explicit `featured: true` article in frontmatter. This is the
 *      editor's hand-picked "you should read this." Prefer deep_dive /
 *      case_study content types when multiple are flagged.
 *   2. Most recent deep_dive or case_study (substantive long-form, our
 *      strongest content).
 *   3. Any article, newest first (fallback so the section never stays
 *      empty on a site with few posts).
 *
 * Excludes the hero (newest post) so the same article never appears in
 * two spots.
 */
function selectRecommendation(
  allPosts: Post[],
  heroSlug: string | undefined,
): Post | null {
  const candidates = allPosts.filter((p) => p.slug !== heroSlug);
  if (candidates.length === 0) return null;

  const LONG_FORM: Array<string | undefined> = ["deep_dive", "case_study"];

  // 1. Explicit featured flag, prefer long-form
  const featuredLongForm = candidates.find(
    (p) => p.featured && LONG_FORM.includes(p.content_type),
  );
  if (featuredLongForm) return featuredLongForm;
  const featuredAny = candidates.find((p) => p.featured);
  if (featuredAny) return featuredAny;

  // 2. Most recent long-form (posts already sorted desc by date)
  const recentLongForm = candidates.find((p) =>
    LONG_FORM.includes(p.content_type),
  );
  if (recentLongForm) return recentLongForm;

  // 3. Fallback: newest article that isn't the hero
  return candidates[0];
}

export default async function HomePage() {
  const allPosts = getAllPosts();
  const subscriberCount = await getSubscriberCount();

  // Hero = newest post, always. getAllPosts() returns posts sorted by
  // date descending, so posts[0] is the latest publish.
  const heroPost: Post | null = allPosts[0] ?? null;
  const latestPost = heroPost ? toMeta(heroPost) : null;

  // Recent posts (first 8 excluding hero)
  const recentPosts = allPosts
    .filter((p) => p.slug !== heroPost?.slug)
    .slice(0, 8)
    .map(toMeta);

  // Featured Deep Dive = curated recommendation (see selectRecommendation).
  const recommendation = selectRecommendation(allPosts, heroPost?.slug);
  const featuredDeepDive = recommendation ? toMeta(recommendation) : null;

  // Trending — 3 recent posts not used elsewhere
  const usedSlugs = new Set([
    latestPost?.slug,
    featuredDeepDive?.slug,
    ...recentPosts.map((p) => p.slug),
  ]);
  const trendingPosts = allPosts
    .filter((p) => !usedSlugs.has(p.slug))
    .slice(0, 3)
    .map(toMeta);

  return (
    <HomeContent
      latestPost={latestPost}
      recentPosts={recentPosts}
      featuredDeepDive={featuredDeepDive}
      trendingPosts={trendingPosts}
      subscriberCount={subscriberCount}
    />
  );
}
