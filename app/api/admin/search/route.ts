import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { verifyAdmin, getServiceClient } from "@/lib/api-auth";

interface SearchItem {
  type: "post" | "keyword" | "competitor" | "outreach" | "affiliate";
  title: string;
  subtitle: string;
  href: string;
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.toLowerCase().trim() ?? "";
  const items: SearchItem[] = [];

  // 1. Posts from post_index.json
  try {
    const indexPath = path.join(process.cwd(), "pipeline/config/post_index.json");
    const raw = await fs.readFile(indexPath, "utf-8");
    const { posts } = JSON.parse(raw) as {
      posts: { slug: string; title: string; funnel_type: string; date: string }[];
    };

    for (const p of posts) {
      items.push({
        type: "post",
        title: p.title,
        subtitle: `${p.funnel_type} · ${formatShortDate(p.date)}`,
        href: "/admin/posts",
      });
    }
  } catch {
    // post_index missing — skip
  }

  // 2. Keywords from seo_gso_config.json
  try {
    const seoPath = path.join(process.cwd(), "pipeline/config/seo_gso_config.json");
    const raw = await fs.readFile(seoPath, "utf-8");
    const config = JSON.parse(raw) as { keyword_targets?: string[] };

    for (const kw of config.keyword_targets ?? []) {
      items.push({
        type: "keyword",
        title: kw,
        subtitle: "Keyword target",
        href: "/admin/seo",
      });
    }
  } catch {
    // seo config missing — skip
  }

  // 3. Competitors from Supabase
  try {
    const sb = getServiceClient();
    const { data: competitors } = await sb
      .from("competitors")
      .select("name, url")
      .order("name");

    for (const c of competitors ?? []) {
      items.push({
        type: "competitor",
        title: c.name,
        subtitle: c.url ?? "No URL",
        href: "/admin/competitors",
      });
    }
  } catch {
    // Supabase unavailable — skip
  }

  // 4. Outreach targets from Supabase
  try {
    const sb = getServiceClient();
    const { data: targets } = await sb
      .from("outreach_targets")
      .select("site_name, site_url, status")
      .order("site_name");

    for (const t of targets ?? []) {
      items.push({
        type: "outreach",
        title: t.site_name,
        subtitle: `${t.status ?? "pending"} · ${t.site_url ?? ""}`,
        href: "/admin/outreach",
      });
    }
  } catch {
    // Supabase unavailable — skip
  }

  // 5. Affiliate links from Supabase
  try {
    const sb = getServiceClient();
    const { data: affiliates } = await sb
      .from("affiliate_links")
      .select("keyword, product_name")
      .order("keyword");

    for (const a of affiliates ?? []) {
      items.push({
        type: "affiliate",
        title: a.product_name ?? a.keyword,
        subtitle: a.keyword,
        href: "/admin/affiliates",
      });
    }
  } catch {
    // Supabase unavailable — skip
  }

  // Filter if query provided
  const filtered = q
    ? items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
      )
    : items;

  return NextResponse.json({ items: filtered });
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
