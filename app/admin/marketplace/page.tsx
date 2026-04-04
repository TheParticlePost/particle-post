"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { WidgetCard } from "@/components/admin/widget-card";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: "specialists", label: "Specialists" },
  { id: "affiliates", label: "Affiliates" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ------------------------------------------------------------------ */
/*  Specialist agents data                                             */
/* ------------------------------------------------------------------ */

const SPECIALISTS = [
  {
    name: "SEO/GSO Specialist",
    module: "seo_gso_specialist",
    description: "Optimizes articles for search engines and generative search. Handles schema markup, keyword targeting, internal linking, and E-E-A-T signals.",
    capabilities: ["Schema markup", "Keyword optimization", "Internal linking", "E-E-A-T", "Meta descriptions"],
  },
  {
    name: "SEO Optimizer",
    module: "seo_optimizer",
    description: "Post-publish SEO optimization. Analyzes live articles for ranking improvements, backlink opportunities, and content gap analysis.",
    capabilities: ["Ranking analysis", "Backlink strategy", "Content gaps", "Competitor comparison"],
  },
  {
    name: "Photo Finder",
    module: "photo_finder",
    description: "Sources and selects relevant images for articles. Uses Pixabay API to find high-quality, royalty-free images matching article topics.",
    capabilities: ["Image search", "Alt text generation", "Aspect ratio selection", "Source attribution"],
  },
  {
    name: "Editor",
    module: "editor",
    description: "Reviews and refines article drafts for clarity, accuracy, brand voice compliance, and AI-tell removal before publication.",
    capabilities: ["Copy editing", "Brand voice", "AI-tell detection", "Fact checking"],
  },
  {
    name: "Researcher",
    module: "researcher",
    description: "Conducts deep research on topics using web search and source analysis. Gathers data, statistics, and expert perspectives for article creation.",
    capabilities: ["Web research", "Source verification", "Data extraction", "Expert sourcing"],
  },
  {
    name: "Formatter",
    module: "formatter",
    description: "Converts raw article content into properly formatted markdown with frontmatter, internal links, and visual diversity elements.",
    capabilities: ["Markdown formatting", "Frontmatter generation", "Visual diversity", "Link insertion"],
  },
  {
    name: "Topic Selector",
    module: "topic_selector",
    description: "Selects daily article topics based on content strategy, funnel balance, theme weights, and current news relevance.",
    capabilities: ["Topic scoring", "Funnel balancing", "Trend analysis", "Deduplication"],
  },
  {
    name: "Writer",
    module: "writer",
    description: "Generates article drafts following the Particle Post brand voice, structure guidelines, and target word counts for each funnel stage.",
    capabilities: ["Draft generation", "Brand voice", "Funnel-specific writing", "Structured output"],
  },
  {
    name: "Publisher",
    module: "publisher",
    description: "Handles the final publication step: commits articles to the repository, updates post_index.json, and triggers Vercel deployment.",
    capabilities: ["Git operations", "Post index updates", "Deployment triggers", "Validation"],
  },
  {
    name: "Production Director",
    module: "production_director",
    description: "Orchestrates the full article production pipeline. Coordinates all specialist agents from research through publication.",
    capabilities: ["Pipeline orchestration", "Quality gates", "Error handling", "Status tracking"],
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Specialists Tab                                                    */
/* ------------------------------------------------------------------ */

function SpecialistsTab() {
  return (
    <div className="space-y-6">
      <WidgetCard title={`Pipeline Specialists (${SPECIALISTS.length})`}>
        <p className="text-body-xs text-text-muted mb-4">
          CrewAI agents that power the article production pipeline. Each specialist handles a specific stage of content creation.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SPECIALISTS.map((agent) => (
            <div
              key={agent.module}
              className="rounded-lg bg-bg-low border border-border-ghost p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-body-sm font-medium text-text-primary">
                  {agent.name}
                </h3>
                <span className="font-mono text-caption text-text-muted shrink-0 ml-2">
                  {agent.module}.py
                </span>
              </div>
              <p className="text-body-xs text-text-secondary leading-relaxed mb-3">
                {agent.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="px-2 py-0.5 rounded-md text-body-xs bg-accent/10 text-accent border border-accent/20"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </WidgetCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Affiliates Tab                                                     */
/* ------------------------------------------------------------------ */

function AffiliatesTab() {
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
          <p className="text-body-sm text-text-muted py-4 animate-pulse">Loading...</p>
        ) : links.length === 0 ? (
          <p className="text-body-sm text-text-muted py-4">No affiliate links configured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-ghost">
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest">Keyword</th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest hidden sm:table-cell">Product</th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right hidden md:table-cell">Rate</th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right">Clicks</th>
                  <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ghost/50">
                {links.map((link) => (
                  <tr key={link.id}>
                    <td className="py-3 text-body-sm text-accent">{link.keyword}</td>
                    <td className="py-3 text-body-sm text-text-primary hidden sm:table-cell">
                      {link.product_name || "\u2014"}
                    </td>
                    <td className="py-3 font-mono text-body-xs text-text-muted text-right hidden md:table-cell">
                      {link.commission_rate || "\u2014"}
                    </td>
                    <td className="py-3 font-mono text-body-xs text-text-primary text-right">
                      {link.clicks}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => toggleActive(link.id, link.active)}
                        className={cn(
                          "px-3 py-1 rounded text-body-xs font-medium transition-colors",
                          link.active
                            ? "bg-green-400/10 text-green-400 hover:bg-green-400/20"
                            : "bg-bg-high text-text-muted hover:text-text-secondary"
                        )}
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MarketplacePage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "specialists";
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some((t) => t.id === initialTab) ? initialTab : "specialists"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-display-lg text-text-primary">
          Marketplace
        </h1>
        <p className="text-body-sm text-text-muted mt-1">
          Pipeline specialists and affiliate link management
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border-ghost mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-body-sm font-medium transition-colors -mb-px whitespace-nowrap",
              activeTab === tab.id
                ? "text-accent border-b-2 border-accent"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "specialists" && <SpecialistsTab />}
      {activeTab === "affiliates" && <AffiliatesTab />}
    </div>
  );
}
