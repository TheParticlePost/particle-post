import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/api-auth";
import * as fs from "fs/promises";
import * as path from "path";

interface PostEntry {
  slug: string;
  title: string;
  funnel_type: string;
  date: string;
  content_type?: string;
  tags?: string[];
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { anchorText, pageTopic, brokenLinkUrl } = await req.json();
  const query = (
    (anchorText || "") +
    " " +
    (pageTopic || "") +
    " " +
    (brokenLinkUrl || "")
  ).toLowerCase();

  if (!query.trim()) {
    return NextResponse.json(
      { error: "anchorText, pageTopic, or brokenLinkUrl required" },
      { status: 400 }
    );
  }

  // Load post index
  let posts: PostEntry[] = [];
  try {
    const content = await fs.readFile(
      path.join(process.cwd(), "pipeline", "config", "post_index.json"),
      "utf-8"
    );
    posts = JSON.parse(content).posts || [];
  } catch {
    return NextResponse.json({ error: "Post index not found" }, { status: 500 });
  }

  // Extract query words (>3 chars)
  const queryWords = query
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => w.replace(/[^a-z0-9]/g, ""));

  // Score each post for relevance
  const scored = posts.map((post) => {
    const titleLower = post.title.toLowerCase();
    const tagStr = (post.tags || []).join(" ").toLowerCase();
    const searchable = titleLower + " " + tagStr + " " + post.slug;

    let score = 0;
    for (const word of queryWords) {
      if (searchable.includes(word)) score += 2;
      // Partial match
      if (titleLower.includes(word.slice(0, 4))) score += 1;
    }

    // Boost recent articles
    const daysSince =
      (Date.now() - new Date(post.date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 2;
    else if (daysSince < 14) score += 1;

    // Boost longer articles (MOF/BOF) as they're more linkworthy
    if (post.funnel_type === "MOF") score += 1;
    if (post.funnel_type === "BOF") score += 1;

    return { ...post, score };
  });

  // Sort by score descending, return top 3
  scored.sort((a, b) => b.score - a.score);
  const matches = scored.slice(0, 3).map((p) => ({
    slug: p.slug,
    title: p.title,
    url: `https://theparticlepost.com/posts/${p.slug}/`,
    score: p.score,
    funnel_type: p.funnel_type,
    date: p.date,
  }));

  return NextResponse.json({ matches });
}
