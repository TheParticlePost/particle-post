import { getAllPosts } from "@/lib/content";
import { HomeContent } from "@/components/home-content";
import type { Post, PostMeta } from "@/lib/types";

// Revalidate every 4 hours so hero rotates between deploys
export const revalidate = 14400;

function toMeta(post: { content: string } & PostMeta): PostMeta {
  const { content, ...meta } = post;
  return meta;
}

function selectHero(posts: Post[]): Post | null {
  if (posts.length === 0) return null;

  // Priority 1: most recent post with featured: true
  const featured = posts.slice(0, 10).find((p) => p.featured);
  if (featured) return featured;

  // Priority 2: time-based rotation through top 5 posts (cycles every 4 hours)
  const pool = Math.min(5, posts.length);
  const rotationIndex = Math.floor(Date.now() / (4 * 60 * 60 * 1000)) % pool;
  return posts[rotationIndex];
}

export default function HomePage() {
  const allPosts = getAllPosts();

  // Hero: featured override or time-based rotation
  const heroPost = selectHero(allPosts);
  const latestPost = heroPost ? toMeta(heroPost) : null;

  // Recent posts (first 8 excluding hero)
  const recentPosts = allPosts
    .filter((p) => p.slug !== heroPost?.slug)
    .slice(0, 8)
    .map(toMeta);

  // Featured deep dive — longest article, prefer different category from hero
  const deepDiveCandidates = allPosts
    .filter((p) => p.slug !== heroPost?.slug)
    .sort((a, b) => b.readingTime - a.readingTime);
  const heroCategory = heroPost?.categories[0];
  const diverseDeepDive = heroCategory
    ? deepDiveCandidates.find((p) => p.categories[0] !== heroCategory)
    : null;
  const deepDive = diverseDeepDive || deepDiveCandidates[0] || null;
  const featuredDeepDive = deepDive ? toMeta(deepDive) : null;

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
    />
  );
}
