"use client";

import { useState, useEffect, useCallback } from "react";
import { WidgetCard } from "@/components/admin/widget-card";

interface Competitor {
  id: string;
  name: string;
  url: string;
  rss_url: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

interface CompetitorArticle {
  id: string;
  competitor_id: string;
  title: string;
  url: string;
  published_at: string | null;
  topics: string[];
  discovered_at: string;
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [recentContent, setRecentContent] = useState<
    (CompetitorArticle & { competitor_name: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/competitors");
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data.competitors || []);
        setRecentContent(data.recentContent || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addCompetitor = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), url: newUrl.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setNewUrl("");
        fetchData();
      }
    } finally {
      setAdding(false);
    }
  };

  const scanCompetitor = async (id: string) => {
    await fetch("/api/competitors/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitorId: id }),
    });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-lg text-text-primary">
          Competitor Monitor
        </h1>
        <p className="text-body-md text-text-muted mt-1">
          Track competitor publications, content frequency, and backlink
          opportunities
        </p>
      </div>

      {/* Add competitor */}
      <WidgetCard title="Add Competitor">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Name (e.g., CFO Dive)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
          />
          <input
            type="url"
            placeholder="URL (e.g., https://www.cfodive.com)"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
          />
          <button
            onClick={addCompetitor}
            disabled={adding || !newName.trim() || !newUrl.trim()}
            className="px-4 py-2 rounded-lg bg-accent text-black text-body-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </div>
      </WidgetCard>

      {/* Competitor list */}
      <WidgetCard title={`Tracked Competitors (${competitors.length})`}>
        {loading ? (
          <p className="text-body-sm text-text-muted py-4 animate-pulse">
            Loading...
          </p>
        ) : competitors.length === 0 ? (
          <p className="text-body-sm text-text-muted py-4">
            No competitors tracked yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-ghost">
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest">
                    Name
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest">
                    URL
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ghost/50">
                {competitors.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 text-body-sm text-text-body">
                      {c.name}
                    </td>
                    <td className="py-3 text-body-xs text-accent max-w-[250px] truncate">
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {c.url}
                      </a>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => scanCompetitor(c.id)}
                        className="px-3 py-1 rounded bg-bg-high border border-border-ghost text-body-xs text-text-secondary hover:border-accent hover:text-accent transition-colors"
                      >
                        Scan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WidgetCard>

      {/* Recent competitor content */}
      {recentContent.length > 0 && (
        <WidgetCard title="Recent Competitor Articles">
          <div className="space-y-3">
            {recentContent.slice(0, 20).map((article) => (
              <div
                key={article.id}
                className="flex items-start gap-3 p-3 bg-bg-low rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-caption text-accent mb-1">
                    {article.competitor_name}
                  </p>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body-sm text-text-body hover:text-accent transition-colors line-clamp-2"
                  >
                    {article.title}
                  </a>
                  {article.topics.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {article.topics.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded bg-bg-high text-body-xs text-text-muted"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {article.published_at && (
                  <span className="font-mono text-caption text-text-muted whitespace-nowrap">
                    {new Date(article.published_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </WidgetCard>
      )}
    </div>
  );
}
