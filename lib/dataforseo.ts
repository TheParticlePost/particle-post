/**
 * DataForSEO API Client
 *
 * Provides typed methods for keyword tracking, backlink analysis,
 * and on-page audits via the DataForSEO v3 REST API.
 *
 * Auth: Basic (base64-encoded login:password)
 * Docs: https://docs.dataforseo.com/v3/
 */

const BASE_URL = "https://api.dataforseo.com/v3";
const DEFAULT_DOMAIN = "theparticlepost.com";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface KeywordRanking {
  keyword: string;
  position: number | null;
  url: string | null;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null;
  lastChecked: string;
}

export interface BacklinkSummary {
  totalBacklinks: number;
  referringDomains: number;
  referringIps: number;
  referringSubnets: number;
  brokenBacklinks: number;
  followLinks: number;
  nofollowLinks: number;
  domainRank: number | null;
  lastUpdated: string;
}

export interface ReferringDomain {
  domain: string;
  backlinks: number;
  firstSeen: string;
  lastSeen: string;
  rank: number | null;
  isLost: boolean;
}

export interface BrokenBacklink {
  url: string;
  anchor: string;
  referringPage: string;
  referringDomain: string;
  firstSeen: string;
  lastSeen: string;
  statusCode: number | null;
}

export interface KeywordVolume {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null;
  monthlySearches: { year: number; month: number; volume: number }[] | null;
}

export interface OnPageResult {
  taskId: string;
  status: string;
  crawledPages: number;
  totalPages: number;
  issues: OnPageIssue[];
  summary: Record<string, number>;
}

export interface OnPageIssue {
  severity: "critical" | "warning" | "info";
  type: string;
  description: string;
  pages: string[];
  count: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getCredentials(): { login: string; password: string } {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error(
      "DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables are required"
    );
  }
  return { login, password };
}

function authHeader(): string {
  const { login, password } = getCredentials();
  const encoded = Buffer.from(`${login}:${password}`).toString("base64");
  return `Basic ${encoded}`;
}

async function apiFetch<T>(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `DataForSEO API error ${res.status} ${res.statusText}: ${text}`
    );
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Generic DataForSEO envelope
// ---------------------------------------------------------------------------

interface DfsEnvelope<T> {
  version: string;
  status_code: number;
  status_message: string;
  tasks: {
    id: string;
    status_code: number;
    status_message: string;
    result: T[] | null;
  }[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get SERP rankings for a list of keywords on a given domain.
 * Uses the SERP Regular POST endpoint (Google, US, English).
 */
export async function getKeywordRankings(
  keywords: string[],
  domain: string = DEFAULT_DOMAIN
): Promise<KeywordRanking[]> {
  const tasks = keywords.map((kw) => ({
    keyword: kw,
    location_code: 2840, // United States
    language_code: "en",
    device: "desktop",
    os: "windows",
    depth: 100,
  }));

  const data = await apiFetch<DfsEnvelope<SerpResult>>(
    "/serp/google/organic/live/regular",
    "POST",
    tasks
  );

  const now = new Date().toISOString();
  const results: KeywordRanking[] = [];

  for (let i = 0; i < data.tasks.length; i++) {
    const task = data.tasks[i];
    const keyword = keywords[i];
    const items = task.result?.[0]?.items ?? [];
    const match = items.find(
      (item: SerpItem) =>
        item.type === "organic" &&
        item.domain?.includes(domain)
    );

    results.push({
      keyword,
      position: match?.rank_absolute ?? null,
      url: match?.url ?? null,
      searchVolume: null,
      cpc: null,
      competition: null,
      lastChecked: now,
    });
  }

  return results;
}

/**
 * Get a backlink summary for the domain.
 */
export async function getBacklinkSummary(
  domain: string = DEFAULT_DOMAIN
): Promise<BacklinkSummary> {
  const data = await apiFetch<DfsEnvelope<BacklinkSummaryRaw>>(
    "/backlinks/summary/live",
    "POST",
    [{ target: domain, internal_list_limit: 0, include_subdomains: true }]
  );

  const r = data.tasks[0]?.result?.[0];
  if (!r) {
    throw new Error("No backlink summary data returned");
  }

  return {
    totalBacklinks: r.total_backlinks ?? 0,
    referringDomains: r.referring_domains ?? 0,
    referringIps: r.referring_ips ?? 0,
    referringSubnets: r.referring_subnets ?? 0,
    brokenBacklinks: r.broken_backlinks ?? 0,
    followLinks: r.follow ?? 0,
    nofollowLinks: r.nofollow ?? 0,
    domainRank: r.rank ?? null,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get referring domains for the target.
 */
export async function getReferringDomains(
  domain: string = DEFAULT_DOMAIN,
  limit: number = 100
): Promise<ReferringDomain[]> {
  const data = await apiFetch<DfsEnvelope<ReferringDomainsRaw>>(
    "/backlinks/referring_domains/live",
    "POST",
    [
      {
        target: domain,
        limit,
        include_subdomains: true,
        order_by: ["rank,desc"],
      },
    ]
  );

  const items = data.tasks[0]?.result?.[0]?.items ?? [];
  return items.map((d: ReferringDomainItem) => ({
    domain: d.domain ?? "",
    backlinks: d.backlinks ?? 0,
    firstSeen: d.first_seen ?? "",
    lastSeen: d.last_visited ?? "",
    rank: d.rank ?? null,
    isLost: d.is_lost ?? false,
  }));
}

/**
 * Start an on-page crawl/audit for the domain.
 * Returns the task ID to poll with `getOnPageResults`.
 */
export async function startOnPageAudit(
  domain: string = DEFAULT_DOMAIN
): Promise<string> {
  const data = await apiFetch<DfsEnvelope<{ id: string }>>(
    "/on_page/task_post",
    "POST",
    [
      {
        target: `https://${domain}/`,
        max_crawl_pages: 200,
        enable_javascript: true,
        load_resources: true,
        enable_browser_rendering: true,
        custom_user_agent:
          "Mozilla/5.0 (compatible; ParticlePostBot/1.0; +https://theparticlepost.com)",
      },
    ]
  );

  const taskId = data.tasks[0]?.id;
  if (!taskId) throw new Error("Failed to start on-page audit — no task ID");
  return taskId;
}

/**
 * Get the results of a previously started on-page audit.
 */
export async function getOnPageResults(
  taskId: string
): Promise<OnPageResult> {
  const data = await apiFetch<DfsEnvelope<OnPageSummaryRaw>>(
    "/on_page/summary",
    "POST",
    [{ id: taskId }]
  );

  const r = data.tasks[0]?.result?.[0];
  if (!r) {
    return {
      taskId,
      status: data.tasks[0]?.status_message ?? "unknown",
      crawledPages: 0,
      totalPages: 0,
      issues: [],
      summary: {},
    };
  }

  const issues: OnPageIssue[] = [];
  const crawlStatus = r.crawl_status;

  // Map page-level issues from the summary
  if (r.page_metrics) {
    const m = r.page_metrics;
    if (m.checks) {
      for (const [checkName, count] of Object.entries(m.checks)) {
        if (typeof count === "number" && count > 0) {
          const severity = checkName.includes("critical")
            ? "critical"
            : checkName.includes("warning")
              ? "warning"
              : "info";
          issues.push({
            severity,
            type: checkName,
            description: checkName.replace(/_/g, " "),
            pages: [],
            count,
          });
        }
      }
    }
  }

  return {
    taskId,
    status: crawlStatus.status ?? data.tasks[0]?.status_message ?? "unknown",
    crawledPages: crawlStatus.pages_crawled ?? 0,
    totalPages: crawlStatus.max_crawl_pages ?? 0,
    issues,
    summary: r.page_metrics?.checks ?? {},
  };
}

/**
 * Get broken (lost) backlinks for the domain.
 */
export async function getBrokenBacklinks(
  domain: string = DEFAULT_DOMAIN
): Promise<BrokenBacklink[]> {
  const data = await apiFetch<DfsEnvelope<BrokenBacklinksRaw>>(
    "/backlinks/backlinks/live",
    "POST",
    [
      {
        target: domain,
        mode: "as_is",
        filters: ["is_lost", "=", true],
        limit: 100,
        include_subdomains: true,
      },
    ]
  );

  const items = data.tasks[0]?.result?.[0]?.items ?? [];
  return items.map((b: BrokenBacklinkItem) => ({
    url: b.url_to ?? "",
    anchor: b.anchor ?? "",
    referringPage: b.url_from ?? "",
    referringDomain: b.domain_from ?? "",
    firstSeen: b.first_seen ?? "",
    lastSeen: b.last_seen ?? "",
    statusCode: b.page_from_status_code ?? null,
  }));
}

/**
 * Get search volume and competition data for a list of keywords.
 * Uses the Keywords Data / Google Ads endpoint.
 */
export async function getKeywordVolume(
  keywords: string[]
): Promise<KeywordVolume[]> {
  const data = await apiFetch<DfsEnvelope<KeywordVolumeRaw>>(
    "/keywords_data/google_ads/search_volume/live",
    "POST",
    [
      {
        keywords,
        location_code: 2840,
        language_code: "en",
      },
    ]
  );

  const items = data.tasks[0]?.result ?? [];
  return keywords.map((kw) => {
    const match = items.find(
      (item: KeywordVolumeItem) =>
        item.keyword?.toLowerCase() === kw.toLowerCase()
    );
    return {
      keyword: kw,
      searchVolume: match?.search_volume ?? null,
      cpc: match?.cpc ?? null,
      competition: match?.competition ?? null,
      monthlySearches:
        match?.monthly_searches?.map(
          (m: { year: number; month: number; search_volume: number }) => ({
            year: m.year,
            month: m.month,
            volume: m.search_volume,
          })
        ) ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Raw API response shapes (internal)
// ---------------------------------------------------------------------------

interface SerpItem {
  type: string;
  rank_absolute: number;
  domain: string;
  url: string;
}

interface SerpResult {
  items: SerpItem[];
}

interface BacklinkSummaryRaw {
  total_backlinks: number;
  referring_domains: number;
  referring_ips: number;
  referring_subnets: number;
  broken_backlinks: number;
  follow: number;
  nofollow: number;
  rank: number | null;
}

interface ReferringDomainsRaw {
  items: ReferringDomainItem[];
}

interface ReferringDomainItem {
  domain: string;
  backlinks: number;
  first_seen: string;
  last_visited: string;
  rank: number | null;
  is_lost: boolean;
}

interface OnPageSummaryRaw {
  crawl_status: {
    status: string;
    pages_crawled: number;
    max_crawl_pages: number;
  };
  page_metrics: {
    checks: Record<string, number>;
  };
}

interface BrokenBacklinksRaw {
  items: BrokenBacklinkItem[];
}

interface BrokenBacklinkItem {
  url_to: string;
  anchor: string;
  url_from: string;
  domain_from: string;
  first_seen: string;
  last_seen: string;
  page_from_status_code: number | null;
}

interface KeywordVolumeRaw {
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition: number | null;
  monthly_searches: { year: number; month: number; search_volume: number }[];
}

type KeywordVolumeItem = KeywordVolumeRaw;
