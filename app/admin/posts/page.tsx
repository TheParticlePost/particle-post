import path from "path";
import fs from "fs/promises";
import { WidgetCard } from "@/components/admin/widget-card";
import { PostsTable } from "@/components/admin/widgets/posts-table";

interface PostIndexEntry {
  slug: string;
  title: string;
  funnel_type: string;
  date: string;
}

interface PostRow {
  slug: string;
  title: string;
  date: string;
  category: string;
  funnel_type: string;
  schema_type: string;
}

async function extractFrontmatter(
  filePath: string
): Promise<{ categories: string[]; schema_type: string }> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    // Quick YAML frontmatter extraction without a full parser
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return { categories: [], schema_type: "Article" };
    const fm = fmMatch[1];

    // Extract first category
    const categories: string[] = [];
    const catMatch = fm.match(/categories:\s*\n((?:\s+-\s+"[^"]*"\n?)*)/);
    if (catMatch) {
      const entries = catMatch[1].matchAll(/\s+-\s+"([^"]*)"/g);
      for (const e of entries) {
        categories.push(e[1]);
      }
    }

    // Extract schema_type
    let schema_type = "Article";
    const schemaMatch = fm.match(/schema_type:\s*"?([^"\n]+)"?/);
    if (schemaMatch) {
      schema_type = schemaMatch[1].trim();
    }

    return { categories, schema_type };
  } catch {
    return { categories: [], schema_type: "Article" };
  }
}

async function loadPostData(): Promise<PostRow[]> {
  try {
    const indexPath = path.join(process.cwd(), "pipeline/config/post_index.json");
    const raw = await fs.readFile(indexPath, "utf-8");
    const data = JSON.parse(raw);
    const posts: PostIndexEntry[] = data.posts ?? [];

    // Get all markdown files for frontmatter enrichment
    const postsDir = path.join(process.cwd(), "blog/content/posts");
    let mdFiles: string[] = [];
    try {
      const entries = await fs.readdir(postsDir);
      mdFiles = entries.filter((f) => f.endsWith(".md"));
    } catch {
      // Directory may not exist
    }

    // Build a slug -> file mapping
    const slugToFile = new Map<string, string>();
    for (const file of mdFiles) {
      // Files are like 2026-03-27-slug-here.md — extract slug after date prefix
      const withoutExt = file.replace(/\.md$/, "");
      const slugPart = withoutExt.replace(/^\d{4}-\d{2}-\d{2}-/, "");
      slugToFile.set(slugPart, path.join(postsDir, file));
    }

    // Enrich each post with frontmatter data
    const enriched = await Promise.all(
      posts.map(async (post) => {
        const filePath = slugToFile.get(post.slug);
        const fm = filePath
          ? await extractFrontmatter(filePath)
          : { categories: [], schema_type: "Article" };

        return {
          slug: post.slug,
          title: post.title,
          date: post.date,
          category: fm.categories[0] ?? "",
          funnel_type: post.funnel_type,
          schema_type: fm.schema_type,
        };
      })
    );

    return enriched;
  } catch {
    return [];
  }
}

export default async function PostsPage() {
  const posts = await loadPostData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-lg text-text-primary">
          Content Management
        </h1>
        <p className="text-body-sm text-text-muted mt-1">
          Browse, sort, and filter all published posts.
        </p>
      </div>

      <WidgetCard title="All Posts">
        <PostsTable posts={posts} />
      </WidgetCard>
    </div>
  );
}
