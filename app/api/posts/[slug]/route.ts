import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/api-auth";
import {
  readConfigFromGitHub,
  writeConfigToGitHub,
  deleteFileFromGitHub,
} from "@/lib/config-writer";
import matter from "gray-matter";

const GITHUB_REPO = "TheParticlePost/particle-post";
const GITHUB_API = "https://api.github.com";
const POSTS_DIR = "blog/content/posts";

function ghHeaders(): Record<string, string> {
  const token = process.env.GH_PAT;
  if (!token) throw new Error("GH_PAT not configured");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

/** Find the markdown file for a slug in blog/content/posts/. */
async function findPostFile(
  slug: string
): Promise<{ path: string; sha: string; content: string } | null> {
  // List files in posts directory
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${POSTS_DIR}`,
    { headers: ghHeaders(), cache: "no-store" }
  );

  if (!res.ok) return null;

  const files: { name: string; path: string }[] = await res.json();
  const match = files.find((f) => {
    const withoutExt = f.name.replace(/\.md$/, "");
    const slugPart = withoutExt.replace(/^\d{4}-\d{2}-\d{2}-/, "");
    return slugPart === slug;
  });

  if (!match) return null;

  // Fetch file content
  const fileRes = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${match.path}`,
    { headers: ghHeaders(), cache: "no-store" }
  );

  if (!fileRes.ok) return null;

  const fileData = await fileRes.json();
  const content = Buffer.from(fileData.content, "base64").toString("utf-8");
  return { path: match.path, sha: fileData.sha, content };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const file = await findPostFile(slug);

  if (!file) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const parsed = matter(file.content);
  const fm = parsed.data as Record<string, unknown>;

  return NextResponse.json({
    slug,
    title: fm.title ?? "",
    description: fm.description ?? "",
    categories: Array.isArray(fm.categories)
      ? fm.categories
      : typeof fm.categories === "string"
        ? [fm.categories]
        : [],
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    funnel_type: fm.funnel_type ?? "TOF",
    schema_type: fm.schema_type ?? "Article",
    draft: fm.draft === true,
    date: fm.date ?? "",
    content: parsed.content.slice(0, 500),
    filePath: file.path,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const file = await findPostFile(slug);
  if (!file) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const parsed = matter(file.content);
  const fm = parsed.data as Record<string, unknown>;

  // Apply allowed updates to frontmatter
  const allowed = [
    "title",
    "description",
    "categories",
    "tags",
    "funnel_type",
    "schema_type",
    "draft",
  ];
  for (const key of allowed) {
    if (key in body) {
      fm[key] = body[key];
    }
  }

  // Rebuild file
  const updated = matter.stringify(parsed.content, fm);
  const encoded = Buffer.from(updated, "utf-8").toString("base64");

  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${file.path}`,
    {
      method: "PUT",
      headers: ghHeaders(),
      body: JSON.stringify({
        message: `admin: update metadata for ${slug}`,
        content: encoded,
        sha: file.sha,
        branch: "main",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: `GitHub API error: ${err}` },
      { status: 502 }
    );
  }

  // Also update post_index.json if title or funnel_type changed
  if ("title" in body || "funnel_type" in body) {
    try {
      const { data: indexData, sha: indexSha } = await readConfigFromGitHub(
        "pipeline/config/post_index.json"
      );
      const posts = (indexData.posts as Array<Record<string, unknown>>) ?? [];
      const idx = posts.findIndex((p) => p.slug === slug);
      if (idx >= 0) {
        if ("title" in body) posts[idx].title = body.title;
        if ("funnel_type" in body) posts[idx].funnel_type = body.funnel_type;
        await writeConfigToGitHub(
          "pipeline/config/post_index.json",
          { ...indexData, posts },
          `admin: update index entry for ${slug}`
        );
      }
    } catch {
      // Non-critical: index update failed but file update succeeded
    }
  }

  return NextResponse.json({ success: true, slug });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const file = await findPostFile(slug);

  if (!file) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Delete the file
  await deleteFileFromGitHub(file.path, `admin: delete post ${slug}`);

  // Remove from post_index.json
  try {
    const { data: indexData } = await readConfigFromGitHub(
      "pipeline/config/post_index.json"
    );
    const posts = (indexData.posts as Array<Record<string, unknown>>) ?? [];
    const filtered = posts.filter((p) => p.slug !== slug);
    await writeConfigToGitHub(
      "pipeline/config/post_index.json",
      { ...indexData, posts: filtered },
      `admin: remove ${slug} from index`
    );
  } catch {
    // Best-effort index cleanup
  }

  // Remove from topics_history.json
  try {
    const { data: topicsData } = await readConfigFromGitHub(
      "pipeline/config/topics_history.json"
    );
    if (Array.isArray(topicsData.topics)) {
      const filtered = (topicsData.topics as Array<Record<string, unknown>>).filter(
        (t) => t.slug !== slug
      );
      await writeConfigToGitHub(
        "pipeline/config/topics_history.json",
        { ...topicsData, topics: filtered },
        `admin: remove ${slug} from topics history`
      );
    }
  } catch {
    // Best-effort cleanup
  }

  return NextResponse.json({ success: true, slug });
}
