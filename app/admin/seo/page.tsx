"use client";

import { useState, useEffect, useCallback } from "react";
import { WidgetCard } from "@/components/admin/widget-card";

/* ---------- Types ---------- */

interface KeywordRanking {
  keyword: string;
  position: number | null;
  volume: number | null;
  url: string | null;
  change: number | null;
}

interface BacklinkSummary {
  totalBacklinks: number;
  referringDomains: number;
  dofollow: number;
  nofollow: number;
  followLinks: number;
  nofollowLinks: number;
  domainRank: number | null;
}

interface ReferringDomain {
  domain: string;
  backlinks: number;
  dofollow: number;
  firstSeen: string;
}

interface BrokenBacklink {
  sourceUrl: string;
  sourceDomain: string;
  targetUrl: string;
  anchorText: string;
  statusCode: number;
}

interface AccountBalance {
  balance: number;
  currency: string;
  totalSpent: number;
  rateLimit: number;
  rateLimitRemaining: number;
}

interface SeoData {
  keywords: KeywordRanking[];
  backlinks: BacklinkSummary | null;
  referringDomains: ReferringDomain[];
  brokenBacklinks: BrokenBacklink[];
  balance: AccountBalance | null;
}

/* ---------- Page ---------- */

export default function SeoPage() {
  const [data, setData] = useState<SeoData>({
    keywords: [],
    backlinks: null,
    referringDomains: [],
    brokenBacklinks: [],
    balance: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [kwRes, blRes, balRes] = await Promise.all([
        fetch("/api/seo/keywords"),
        fetch("/api/seo/backlinks?include=referring,broken"),
        fetch("/api/seo/balance"),
      ]);

      const kwData = kwRes.ok ? await kwRes.json() : { keywords: [] };
      const blData = blRes.ok
        ? await blRes.json()
        : { summary: null, referringDomains: [], brokenBacklinks: [] };
      const balData = balRes.ok ? await balRes.json() : null;

      setData({
        keywords: kwData.keywords || [],
        backlinks: blData.summary || null,
        referringDomains: blData.referringDomains || [],
        brokenBacklinks: blData.brokenBacklinks || [],
        balance: balData,
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-display-lg text-text-primary">
            SEO Intelligence
          </h1>
          <p className="text-body-md text-text-muted mt-1">
            Keyword rankings, backlink profile, and site audit via DataForSEO
          </p>
        </div>
        <WidgetCard title="Loading...">
          <div className="py-12 text-center">
            <p className="text-body-md text-text-muted animate-pulse">
              Fetching SEO data...
            </p>
          </div>
        </WidgetCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-display-lg text-text-primary">
            SEO Intelligence
          </h1>
        </div>
        <WidgetCard title="Error">
          <p className="text-body-md text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 rounded-lg bg-accent text-black text-body-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Retry
          </button>
        </WidgetCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-lg text-text-primary">
            SEO Intelligence
          </h1>
          <p className="text-body-md text-text-muted mt-1">
            Keyword rankings, backlink profile, and site audit via DataForSEO
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-secondary hover:border-accent hover:text-accent transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Credit Balance */}
      {data.balance && (
        <WidgetCard title="DataForSEO Credits">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-bg-low rounded-lg p-4">
              <p className="font-mono text-caption text-text-muted uppercase tracking-widest mb-1">
                Balance
              </p>
              <p className="font-display text-display-sm text-accent">
                ${data.balance.balance.toFixed(2)}
              </p>
              <p className="font-mono text-caption text-text-muted mt-1">
                {data.balance.currency}
              </p>
            </div>
            <div className="bg-bg-low rounded-lg p-4">
              <p className="font-mono text-caption text-text-muted uppercase tracking-widest mb-1">
                Total Spent
              </p>
              <p className="font-display text-display-sm text-text-primary">
                ${data.balance.totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="bg-bg-low rounded-lg p-4">
              <p className="font-mono text-caption text-text-muted uppercase tracking-widest mb-1">
                Daily Rate Limit
              </p>
              <p className="font-display text-display-sm text-text-primary">
                {data.balance.rateLimit.toLocaleString()}
              </p>
            </div>
            <div className="bg-bg-low rounded-lg p-4">
              <p className="font-mono text-caption text-text-muted uppercase tracking-widest mb-1">
                Remaining Today
              </p>
              <p className={`font-display text-display-sm ${
                data.balance.rateLimitRemaining > data.balance.rateLimit * 0.2
                  ? "text-green-400"
                  : "text-red-400"
              }`}>
                {data.balance.rateLimitRemaining.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="font-mono text-caption text-text-muted mt-3">
            Cost per keyword check: ~$0.002 · Backlink summary: ~$0.002 · On-page audit: ~$0.01/page
          </p>
        </WidgetCard>
      )}

      {/* Domain Overview */}
      {data.backlinks && (
        <WidgetCard title="Domain Overview">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Domain Rank",
                value: data.backlinks.domainRank ?? "—",
              },
              {
                label: "Total Backlinks",
                value: data.backlinks.totalBacklinks.toLocaleString(),
              },
              {
                label: "Referring Domains",
                value: data.backlinks.referringDomains.toLocaleString(),
              },
              {
                label: "Dofollow",
                value: (data.backlinks.dofollow || data.backlinks.followLinks || 0).toLocaleString(),
              },
            ].map((m) => (
              <div key={m.label} className="bg-bg-low rounded-lg p-4">
                <p className="font-mono text-caption text-text-muted uppercase tracking-widest mb-1">
                  {m.label}
                </p>
                <p className="font-display text-display-sm text-text-primary">
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </WidgetCard>
      )}

      {/* Keyword Rankings */}
      <WidgetCard title="Keyword Rankings">
        {data.keywords.length === 0 ? (
          <p className="text-body-sm text-text-muted py-4">
            No keyword data available. Configure DATAFORSEO_LOGIN and
            DATAFORSEO_PASSWORD in .env.local
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-ghost">
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest">
                    Keyword
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right">
                    Position
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right hidden sm:table-cell">
                    Volume
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right hidden md:table-cell">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ghost/50">
                {data.keywords.map((kw) => (
                  <tr key={kw.keyword} className="group">
                    <td className="py-3 text-body-sm text-text-body">
                      {kw.keyword}
                    </td>
                    <td className="py-3 font-mono text-data text-right">
                      <span
                        className={
                          kw.position && kw.position <= 10
                            ? "text-accent"
                            : kw.position && kw.position <= 30
                            ? "text-text-primary"
                            : "text-text-muted"
                        }
                      >
                        {kw.position ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-data text-text-muted text-right hidden sm:table-cell">
                      {kw.volume?.toLocaleString() ?? "—"}
                    </td>
                    <td className="py-3 font-mono text-data text-right hidden md:table-cell">
                      {kw.change !== null && kw.change !== 0 ? (
                        <span
                          className={
                            kw.change > 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {kw.change > 0 ? "+" : ""}
                          {kw.change}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WidgetCard>

      {/* Referring Domains */}
      {data.referringDomains.length > 0 && (
        <WidgetCard title="Top Referring Domains">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-ghost">
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest">
                    Domain
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right">
                    Backlinks
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right hidden sm:table-cell">
                    Dofollow
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ghost/50">
                {data.referringDomains.slice(0, 15).map((rd) => (
                  <tr key={rd.domain}>
                    <td className="py-3 text-body-sm text-accent">
                      {rd.domain}
                    </td>
                    <td className="py-3 font-mono text-data text-text-primary text-right">
                      {rd.backlinks}
                    </td>
                    <td className="py-3 font-mono text-data text-text-muted text-right hidden sm:table-cell">
                      {rd.dofollow}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WidgetCard>
      )}

      {/* Broken Backlinks */}
      {data.brokenBacklinks.length > 0 && (
        <WidgetCard title="Broken Backlinks (Lost)">
          <p className="text-body-xs text-text-muted mb-4">
            External pages that linked to you but the link is now broken.
            Consider adding redirects or reaching out to reclaim.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-ghost">
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest">
                    Source
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest">
                    Target
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ghost/50">
                {data.brokenBacklinks.slice(0, 20).map((bl, i) => (
                  <tr key={i}>
                    <td className="py-3 text-body-xs text-text-body max-w-[200px] truncate">
                      {bl.sourceDomain}
                    </td>
                    <td className="py-3 text-body-xs text-text-muted max-w-[200px] truncate">
                      {bl.targetUrl}
                    </td>
                    <td className="py-3 font-mono text-data text-red-400 text-right">
                      {bl.statusCode}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WidgetCard>
      )}
    </div>
  );
}
