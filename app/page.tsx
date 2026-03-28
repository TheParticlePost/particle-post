import { getAllPosts } from "@/lib/content";
import { HomeContent } from "@/components/home-content";
import type { PostMeta } from "@/lib/types";

function toMeta(post: { content: string } & PostMeta): PostMeta {
  const { content, ...meta } = post;
  return meta;
}

export default function HomePage() {
  const allPosts = getAllPosts();

  // Latest post for hero
  const latestPost = allPosts[0] ? toMeta(allPosts[0]) : null;

  // Morning posts (first 4 after latest)
  const morningPosts = allPosts.slice(1, 5).map(toMeta);

  // Evening posts (next 4)
  const eveningPosts = allPosts.slice(5, 9).map(toMeta);

  // Featured deep dive — longest article
  const deepDive = allPosts.slice(1).sort((a, b) => b.readingTime - a.readingTime)[0];
  const featuredDeepDive = deepDive ? toMeta(deepDive) : allPosts[1] ? toMeta(allPosts[1]) : null;

  // Trending — 3 recent posts not used elsewhere
  const usedSlugs = new Set([
    latestPost?.slug,
    featuredDeepDive?.slug,
    ...morningPosts.map((p) => p.slug),
    ...eveningPosts.map((p) => p.slug),
  ]);
  const trendingPosts = allPosts
    .filter((p) => !usedSlugs.has(p.slug))
    .slice(0, 3)
    .map(toMeta);

  return (
    <HomeContent
      latestPost={latestPost}
      morningPosts={morningPosts}
      eveningPosts={eveningPosts}
      featuredDeepDive={featuredDeepDive}
      trendingPosts={trendingPosts}
    />
  );
}
