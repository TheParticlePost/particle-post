import path from "path";
import fs from "fs/promises";
import { getSupabaseClient } from "@/lib/supabase";
import { WidgetCard } from "@/components/admin/widget-card";
import { StatsOverview } from "@/components/admin/widgets/stats-overview";
import { RecentPosts } from "@/components/admin/widgets/recent-posts";
import { SubscriberChart } from "@/components/admin/widgets/subscriber-chart";
import { PipelineStatus } from "@/components/admin/widgets/pipeline-status";
import { SeoMetrics } from "@/components/admin/widgets/seo-metrics";
import { CategoryBreakdown } from "@/components/admin/widgets/category-breakdown";

interface PostIndexEntry {
  slug: string;
  title: string;
  funnel_type: string;
  date: string;
}

interface TopicsHistoryEntry {
  title: string;
  slug: string;
  tags: string[];
  filename: string;
  published_at: string;
}

async function getPostIndex(): Promise<PostIndexEntry[]> {
  try {
    const filePath = path.join(process.cwd(), "pipeline/config/post_index.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return data.posts ?? [];
  } catch {
    return [];
  }
}

async function getTopicsHistory(): Promise<TopicsHistoryEntry[]> {
  try {
    const filePath = path.join(process.cwd(), "blog/data/topics_history.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return data.posts ?? [];
  } catch {
    return [];
  }
}

async function getSubscriberCount(): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    const { count } = await supabase
      .from("subscribers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function getSubscribersByDay(): Promise<{ date: string; count: number }[]> {
  try {
    const supabase = getSupabaseClient();
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data } = await supabase
      .from("subscribers")
      .select("subscribed_at")
      .eq("status", "active")
      .gte("subscribed_at", fourteenDaysAgo.toISOString());

    // Build a map of date -> count for last 14 days
    const countMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      countMap.set(key, 0);
    }

    if (data) {
      for (const row of data) {
        const key = new Date(row.subscribed_at).toISOString().split("T")[0];
        if (countMap.has(key)) {
          countMap.set(key, (countMap.get(key) ?? 0) + 1);
        }
      }
    }

    return Array.from(countMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  } catch {
    return [];
  }
}

function buildCategoryBreakdown(
  topics: TopicsHistoryEntry[]
): { name: string; count: number }[] {
  const tagCounts = new Map<string, number>();
  for (const post of topics) {
    for (const tag of post.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export default async function AdminDashboard() {
  const [posts, topics, subscriberCount, subscribersByDay] = await Promise.all([
    getPostIndex(),
    getTopicsHistory(),
    getSubscriberCount(),
    getSubscribersByDay(),
  ]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const postsThisMonth = posts.filter((p) => {
    const d = new Date(p.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  // Sort posts by date descending for recent list
  const recentPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Pipeline status: derive from the latest post date
  const lastRunDate = recentPosts.length > 0 ? recentPosts[0].date : null;

  // Category breakdown from topics tags
  const categories = buildCategoryBreakdown(topics);

  // SEO metrics
  const totalPages = posts.length;
  const sitemapUrl = "https://theparticlepost.com/sitemap.xml";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-display-lg text-foreground">
          Dashboard
        </h1>
        <p className="text-body-sm text-foreground-muted mt-1">
          Overview of Particle Post content and growth.
        </p>
      </div>

      {/* Stats row */}
      <WidgetCard title="At a Glance">
        <StatsOverview
          postCount={posts.length}
          subscriberCount={subscriberCount}
          postsThisMonth={postsThisMonth}
        />
      </WidgetCard>

      {/* Two column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WidgetCard
          title="Recent Posts"
          action={{ label: "View all", href: "/admin/posts" }}
        >
          <RecentPosts posts={recentPosts.slice(0, 5)} />
        </WidgetCard>

        <WidgetCard title="Subscriber Growth">
          <SubscriberChart data={subscribersByDay} />
        </WidgetCard>

        <WidgetCard title="Pipeline Status">
          <PipelineStatus
            lastRunDate={lastRunDate}
            totalPosts={posts.length}
            rejectCount={0}
          />
        </WidgetCard>

        <WidgetCard title="SEO Overview">
          <SeoMetrics totalPages={totalPages} sitemapUrl={sitemapUrl} />
        </WidgetCard>

        <WidgetCard title="Top Categories" className="lg:col-span-2">
          <CategoryBreakdown categories={categories} />
        </WidgetCard>
      </div>
    </div>
  );
}
