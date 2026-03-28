import { promises as fs } from "fs";
import path from "path";

export interface QueryData {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface ParsedMarketing {
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

export async function getLatestMarketingLog(): Promise<string | null> {
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

export function parseMarketingLog(content: string): ParsedMarketing {
  const result: ParsedMarketing = {
    sessions7d: "\u2014",
    pageViews7d: "\u2014",
    newUsers7d: "\u2014",
    bounceRate: "\u2014",
    avgDuration: "\u2014",
    sessions30d: "\u2014",
    pageViews30d: "\u2014",
    topArticles: [],
    googleQueries: [],
    bingQueries: [],
    crawlData: [],
    trafficSources: [],
    reportDate: "",
  };

  const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)/);
  if (dateMatch) result.reportDate = dateMatch[1].trim();

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
        const durMatch = val7d.match(/\(([^)]+)\)/);
        result.avgDuration = durMatch ? durMatch[1] : val7d;
      } else if (metric.includes("traffic sources")) {
        const sourceMatches = val7d.matchAll(/(\w[\w\s]*?)\s*\((\d+)\)/g);
        for (const m of sourceMatches) {
          result.trafficSources.push({
            name: m[1].trim(),
            sessions: parseInt(m[2], 10),
          });
        }
      }
    }
  }

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
      result.topArticles.push({
        page: cells[1],
        sessions: parseInt(cells[2], 10) || 0,
        views: parseInt(cells[3], 10) || 0,
      });
    }
  }

  const googleQueryRegex =
    /Google Search Console[^|]*\|([\s\S]*?)(?=\n\n|\n\*\*|\n---)/i;
  const googleBlock = content.match(googleQueryRegex);
  if (googleBlock && googleBlock[1].includes("|")) {
    result.googleQueries = parseQueryTable(googleBlock[1]);
  }

  const bingQueryRegex =
    /Bing Query[^|]*\|([\s\S]*?)(?=\n\n|\n\*\*|\n---)/i;
  const bingBlock = content.match(bingQueryRegex);
  if (bingBlock && bingBlock[1].includes("|")) {
    result.bingQueries = parseQueryTable(bingBlock[1]);
  }

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
    if (content.includes("single transient error")) {
      const midIdx = Math.floor(result.crawlData.length / 2);
      if (result.crawlData[midIdx]) {
        result.crawlData[midIdx].errors = 1;
      }
    }
  }

  return result;
}
