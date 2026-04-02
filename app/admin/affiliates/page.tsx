"use client";

import { useState, useEffect, useCallback } from "react";
import { WidgetCard } from "@/components/admin/widget-card";

interface AffiliateLink {
  id: string;
  keyword: string;
  url: string;
  product_name: string | null;
  commission_rate: string | null;
  active: boolean;
  max_insertions_per_article: number;
  clicks: number;
  created_at: string;
}

export default function AffiliatesPage() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [url, setUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/affiliates");
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
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

  const addLink = async () => {
    if (!keyword.trim() || !url.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          url: url.trim(),
          product_name: productName.trim() || null,
          commission_rate: commissionRate.trim() || null,
        }),
      });
      if (res.ok) {
        setKeyword("");
        setUrl("");
        setProductName("");
        setCommissionRate("");
        fetchData();
      }
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await fetch("/api/affiliates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    fetchData();
  };

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
  const activeCount = links.filter((l) => l.active).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-lg text-text-primary">
          Affiliate Links
        </h1>
        <p className="text-body-md text-text-muted mt-1">
          Manage affiliate links — auto-inserted into articles at publish and
          render time
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Links", value: links.length },
          { label: "Active", value: activeCount },
          { label: "Total Clicks", value: totalClicks },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-bg-container border border-border-ghost rounded-lg p-4 text-center"
          >
            <p className="font-mono text-caption text-text-muted uppercase tracking-widest mb-1">
              {s.label}
            </p>
            <p className="font-display text-display-sm text-text-primary">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Add link */}
      <WidgetCard title="Add Affiliate Link">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder='Keyword (e.g., "Claude")'
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="px-3 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
          />
          <input
            type="url"
            placeholder="Affiliate URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="px-3 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
          />
          <input
            type="text"
            placeholder="Product name (optional)"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="px-3 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
          />
          <input
            type="text"
            placeholder='Commission rate (e.g., "30%")'
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={addLink}
          disabled={adding || !keyword.trim() || !url.trim()}
          className="mt-3 px-4 py-2 rounded-lg bg-accent text-black text-body-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add Link"}
        </button>
      </WidgetCard>

      {/* Links table */}
      <WidgetCard title="All Affiliate Links">
        {loading ? (
          <p className="text-body-sm text-text-muted py-4 animate-pulse">
            Loading...
          </p>
        ) : links.length === 0 ? (
          <p className="text-body-sm text-text-muted py-4">
            No affiliate links configured yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-ghost">
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest">
                    Keyword
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest hidden sm:table-cell">
                    Product
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right hidden md:table-cell">
                    Rate
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right">
                    Clicks
                  </th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ghost/50">
                {links.map((link) => (
                  <tr key={link.id}>
                    <td className="py-3 text-body-sm text-accent">
                      {link.keyword}
                    </td>
                    <td className="py-3 text-body-sm text-text-body hidden sm:table-cell">
                      {link.product_name || "—"}
                    </td>
                    <td className="py-3 font-mono text-data text-text-muted text-right hidden md:table-cell">
                      {link.commission_rate || "—"}
                    </td>
                    <td className="py-3 font-mono text-data text-text-primary text-right">
                      {link.clicks}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => toggleActive(link.id, link.active)}
                        className={`px-3 py-1 rounded text-body-xs font-medium transition-colors ${
                          link.active
                            ? "bg-green-400/10 text-green-400 hover:bg-green-400/20"
                            : "bg-bg-high text-text-muted hover:text-text-secondary"
                        }`}
                      >
                        {link.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WidgetCard>
    </div>
  );
}
