import RSS from "rss";
import { getAllPosts } from "@/lib/content";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://theparticlepost.com";

export async function GET() {
  const posts = getAllPosts();

  const feed = new RSS({
    title: "Particle Post",
    description: "Twice-daily AI briefings for business leaders. Implementation strategies, operational decisions, and what actually works.",
    site_url: BASE_URL,
    feed_url: `${BASE_URL}/feed.xml/`,
    language: "en",
    pubDate: posts[0]?.date ? new Date(posts[0].date) : new Date(),
    copyright: `${new Date().getFullYear()} Particle Post`,
  });

  for (const post of posts) {
    feed.item({
      title: post.title,
      description: post.description,
      url: `${BASE_URL}/posts/${post.slug}/`,
      date: new Date(post.date),
      categories: post.categories,
      author: post.author || "Particle Post",
    });
  }

  return new Response(feed.xml({ indent: true }), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
