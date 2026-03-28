import { promises as fs } from "fs";
import path from "path";
import { WidgetCard } from "@/components/admin/widget-card";
import { AnalyticsOverview } from "@/components/admin/widgets/analytics-overview";
import {
  SearchComparison,
  type QueryData,
} from "@/components/admin/widgets/search-comparison";
import { FunnelChart } from "@/components/admin/widgets/funnel-chart";
import { SchemaCoverage } from "@/components/admin/widgets/schema-coverage";
import { TrafficSources } from "@/components/admin/widgets/traffic-sources";
import { CrawlHealth } from "@/components/admin/widgets/crawl-health";
import { getLatestMarketingLog, parseMarketingLog } from "@/lib/marketing-log";

export const metadata = {
  title: "Analytics — Particle Post Admin",
  robots: { index: false, follow: false },
};

/* ---------- Types ---------- */

interface PostEntry {
  slug: string;
  title: string;
  funnel_type: string;
  date: string;
}

interface SeoConfig {
  schema_coverage: Record<string, number>;
  keyword_targets: string[];
}

async function getPostIndex(): Promise<PostEntry[]> {
  try {
    const content = await fs.readFile(
      path.join(process.cwd(), "pipeline", "config", "post_index.json"),
      "utf-8"
    );
    const parsed = JSON.parse(content) as { posts: PostEntry[] };
    return parsed.posts;
  } catch {
    return [];
  }
}

async function getSeoConfig(): Promise<SeoConfig | null> {
  try {
    const content = await fs.readFile(
      path.join(process.cwd(), "pipeline", "config", "seo_gso_config.json"),
      "utf-8"
    );
    return JSON.parse(content) as SeoConfig;
  } catch {
    return null;
  }
}

/* ---------- Page ---------- */

export default async function AnalyticsPage() {
  const [logContent, posts, seoConfig] = await Promise.all([
    getLatestMarketingLog(),
    getPostIndex(),
    getSeoConfig(),
  ]);

  // If no marketing log exists, show placeholder
  if (!logContent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-display-lg text-foreground">
            Analytics
          </h1>
          <p className="text-body-md text-foreground-muted mt-1">
            Unified view of GA4, Google Search Console, and Bing Webmaster data
          </p>
        </div>
        <WidgetCard title="Awaiting Data">
          <div className="py-12 text-center">
            <p className="text-body-md text-foreground-muted">
              Analytics data will appear after the Marketing Director runs.
            </p>
            <p className="text-body-sm text-foreground-muted mt-2">
              The marketing pipeline writes daily reports to{" "}
              <code className="text-accent text-body-xs">
                pipeline/logs/marketing/
              </code>
            </p>
          </div>
        </WidgetCard>
      </div>
    );
  }

  const data = parseMarketingLog(logContent);

  // Calculate funnel distribution from post index
  const funnelCounts = { TOF: 0, MOF: 0, BOF: 0 };
  for (const post of posts) {
    const ft = post.funnel_type as keyof typeof funnelCounts;
    if (ft in funnelCounts) funnelCounts[ft]++;
  }

  const funnelData = [
    { label: "TOF (Awareness)", count: funnelCounts.TOF, color: "#00d4aa" },
    { label: "MOF (Consideration)", count: funnelCounts.MOF, color: "#3B82F6" },
    { label: "BOF (Decision)", count: funnelCounts.BOF, color: "#8B5CF6" },
  ];

  // Schema coverage from seo config
  const schemaData = seoConfig
    ? Object.entries(seoConfig.schema_coverage).map(([type, count]) => ({
        type,
        count,
      }))
    : [];

  // Overview metrics
  const totalSearchClicks =
    data.googleQueries.reduce((s, q) => s + q.clicks, 0) +
    data.bingQueries.reduce((s, q) => s + q.clicks, 0);

  const overviewMetrics = [
    { label: "Sessions (7d)", value: data.sessions7d },
    { label: "Page Views (7d)", value: data.pageViews7d },
    { label: "New Users (7d)", value: data.newUsers7d },
    { label: "Bounce Rate", value: data.bounceRate },
    { label: "Avg Duration", value: data.avgDuration },
    {
      label: "Search Clicks",
      value: totalSearchClicks > 0 ? totalSearchClicks.toLocaleString() : "0",
      subtext: "Google + Bing combined",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-display-lg text-foreground">
          Analytics
        </h1>
        <p className="text-body-md text-foreground-muted mt-1">
          Unified view of GA4, Google Search Console, and Bing Webmaster data
          {data.reportDate && (
            <span className="ml-2 text-body-xs text-foreground-muted">
              — Last report: {data.reportDate}
            </span>
          )}
        </p>
      </div>

      {/* Section 1: Overview Cards */}
      <WidgetCard title="Traffic Overview">
        <AnalyticsOverview metrics={overviewMetrics} />
        {data.trafficSources.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[var(--border)]">
            <h3 className="text-body-sm font-medium text-foreground-secondary mb-3">
              Traffic Sources
            </h3>
            <TrafficSources sources={data.trafficSources} />
          </div>
        )}
      </WidgetCard>

      {/* Section 2: Search Performance */}
      <WidgetCard title="Search Performance">
        <SearchComparison
          googleQueries={data.googleQueries}
          bingQueries={data.bingQueries}
        />
      </WidgetCard>

      {/* Section 3: Content Performance — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WidgetCard title="Funnel Distribution">
          <FunnelChart data={funnelData} />
        </WidgetCard>
        <WidgetCard title="Schema Coverage">
          <SchemaCoverage data={schemaData} />
        </WidgetCard>
      </div>

      {/* Section 4: Health */}
      <WidgetCard title="Crawl & Index Health">
        <CrawlHealth data={data.crawlData} />
      </WidgetCard>
    </div>
  );
}
