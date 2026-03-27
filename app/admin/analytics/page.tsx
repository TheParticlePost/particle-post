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

interface ParsedMarketing {
  sessions7d: string;
  pageViews7d: string;
  newUsers7d: string;
  bounceRate: string;
  avgDuration: string;
  sessions30d: string;
  pageViews30d: string;
  topArticles: { page: string; sessions: number; views: number }[];
  googleQueries: QueryData[];
  bingQueries: QueryData[];
  crawlData: { date: string; crawled: number; errors: number }[];
  trafficSources: { name: string; sessions: number }[];
  reportDate: string;
}

/* ---------- Helpers ---------- */

async function getLatestMarketingLog(): Promise<string | null> {
  const dir = path.join(process.cwd(), "pipeline", "logs", "marketing");
  try {
    const files = await fs.readdir(dir);
    const mdFiles = files
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();
    if (mdFiles.length === 0) return null;
    return fs.readFile(path.join(dir, mdFiles[0]), "utf-8");
  } catch {
    return null;
  }
}

function parseMarketingLog(content: string): ParsedMarketing {
  const result: ParsedMarketing = {
    sessions7d: "—",
    pageViews7d: "—",
    newUsers7d: "—",
    bounceRate: "—",
    avgDuration: "—",
    sessions30d: "—",
    pageViews30d: "—",
    topArticles: [],
    googleQueries: [],
    bingQueries: [],
    crawlData: [],
    trafficSources: [],
    reportDate: "",
  };

  // Extract report date
  const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)/);
  if (dateMatch) result.reportDate = dateMatch[1].trim();

  // Parse traffic summary table
  // Format: | Metric | 7-Day | 30-Day |
  const trafficTableRegex =
    /## Traffic Summary[\s\S]*?\|[-\s|]+\|([\s\S]*?)(?=\n\n|\n\*\*|\n---)/;
  const trafficBlock = content.match(trafficTableRegex);
  if (trafficBlock) {
    const rows = trafficBlock[1]
      .split("\n")
      .filter((r) => r.includes("|") && !r.match(/^[\s|:-]+$/));

    for (const row of rows) {
      const cells = row
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length < 2) continue;
      const metric = cells[0].toLowerCase();
      const val7d = cells[1];
      const val30d = cells.length > 2 ? cells[2] : "";

      if (metric.includes("sessions") && !metric.includes("duration")) {
        result.sessions7d = val7d;
        result.sessions30d = val30d || val7d;
      } else if (metric.includes("page views")) {
        result.pageViews7d = val7d;
        result.pageViews30d = val30d || val7d;
      } else if (metric.includes("new users")) {
        result.newUsers7d = val7d;
      } else if (metric.includes("bounce")) {
        result.bounceRate = val7d;
      } else if (metric.includes("duration")) {
        // Extract parenthetical human-readable form if available
        const durMatch = val7d.match(/\(([^)]+)\)/);
        result.avgDuration = durMatch ? durMatch[1] : val7d;
      } else if (metric.includes("traffic sources")) {
        // Parse traffic sources: "Direct (1), Referral (1), Unassigned (1)"
        const sourceMatches = val7d.matchAll(
          /(\w[\w\s]*?)\s*\((\d+)\)/g
        );
        for (const m of sourceMatches) {
          result.trafficSources.push({
            name: m[1].trim(),
            sessions: parseInt(m[2], 10),
          });
        }
      }
    }
  }

  // Parse top performing articles table
  // Format: | Rank | Page | Sessions | Views |
  const articlesRegex =
    /## Top Performing[\s\S]*?\|[-\s|]+\|([\s\S]*?)(?=\n\n|\n\*\*|\n---)/;
  const articlesBlock = content.match(articlesRegex);
  if (articlesBlock) {
    const rows = articlesBlock[1]
      .split("\n")
      .filter((r) => r.includes("|") && !r.match(/^[\s|:-]+$/));

    for (const row of rows) {
      const cells = row
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length < 4) continue;
      // cells: [rank, page, sessions, views]
      result.topArticles.push({
        page: cells[1],
        sessions: parseInt(cells[2], 10) || 0,
        views: parseInt(cells[3], 10) || 0,
      });
    }
  }

  // Parse keyword/query tables if they exist
  // Google queries
  const googleQueryRegex =
    /Google Search Console[^|]*\|([\s\S]*?)(?=\n\n|\n\*\*|\n---)/i;
  const googleBlock = content.match(googleQueryRegex);
  if (googleBlock && googleBlock[1].includes("|")) {
    result.googleQueries = parseQueryTable(googleBlock[1]);
  }

  // Bing queries
  const bingQueryRegex =
    /Bing Query[^|]*\|([\s\S]*?)(?=\n\n|\n\*\*|\n---)/i;
  const bingBlock = content.match(bingQueryRegex);
  if (bingBlock && bingBlock[1].includes("|")) {
    result.bingQueries = parseQueryTable(bingBlock[1]);
  }

  // Parse crawl health data from the log text
  // Look for patterns like "0 → 1 → 2 → 3 → 5 pages/day"
  const crawlProgressMatch = content.match(
    /(\d+)\s*(?:→|->)\s*(\d+)\s*(?:→|->)\s*(\d+)\s*(?:→|->)\s*(\d+)\s*(?:→|->)\s*(\d+)\s*pages\/day/
  );
  if (crawlProgressMatch && result.reportDate) {
    const values = [
      parseInt(crawlProgressMatch[1], 10),
      parseInt(crawlProgressMatch[2], 10),
      parseInt(crawlProgressMatch[3], 10),
      parseInt(crawlProgressMatch[4], 10),
      parseInt(crawlProgressMatch[5], 10),
    ];
    // Create synthetic dates working backwards from report date
    const baseDate = new Date(result.reportDate);
    for (let i = values.length - 1; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - (values.length - 1 - i) * 2);
      result.crawlData.push({
        date: d.toISOString().split("T")[0],
        crawled: values[i],
        errors: 0,
      });
    }
    // Note transient error
    if (content.includes("single transient error")) {
      const midIdx = Math.floor(result.crawlData.length / 2);
      if (result.crawlData[midIdx]) {
        result.crawlData[midIdx].errors = 1;
      }
    }
  }

  return result;
}

function parseQueryTable(tableContent: string): QueryData[] {
  const queries: QueryData[] = [];
  const rows = tableContent
    .split("\n")
    .filter((r) => r.includes("|") && !r.match(/^[\s|:-]+$/));

  for (const row of rows) {
    const cells = row
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 5) continue;
    // Skip header rows
    if (cells[0].toLowerCase().includes("query")) continue;

    queries.push({
      query: cells[0],
      clicks: parseInt(cells[1], 10) || 0,
      impressions: parseInt(cells[2], 10) || 0,
      ctr: parseFloat(cells[3]) || 0,
      position: parseFloat(cells[4]) || 0,
    });
  }
  return queries;
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
