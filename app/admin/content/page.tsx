"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { WidgetCard } from "@/components/admin/widget-card";
import { ScheduleEditor } from "@/components/admin/widgets/schedule-editor";
import { ThemeWeightEditor } from "@/components/admin/widgets/theme-weight-editor";
import { ContentMixEditor } from "@/components/admin/widgets/content-mix-editor";
import { AiTellsManager } from "@/components/admin/widgets/ai-tells-manager";
import { PipelineConfigEditor } from "@/components/admin/widgets/pipeline-config-editor";
import { AgentLogs } from "@/components/admin/widgets/agent-logs";
import { AgentRunDialog } from "@/components/admin/widgets/agent-run-dialog";
import { HumanPostDialog } from "@/components/admin/widgets/human-post-dialog";

const TABS = [
  { id: "articles", label: "Articles" },
  { id: "pipeline", label: "Pipeline" },
  { id: "strategy", label: "Strategy" },
];

const AGENTS = [
  { name: "Morning Post", workflow: "morning-post.yml" },
  { name: "Evening Post", workflow: "evening-post.yml" },
  { name: "Marketing Director", workflow: "marketing-director.yml" },
  { name: "Content Audit", workflow: "content-audit.yml" },
  { name: "Security Audit", workflow: "security-audit.yml" },
  { name: "UI Designer", workflow: "ui-designer.yml" },
];

interface PostEntry {
  slug: string;
  title: string;
  funnel_type: string;
  date: string;
  content_type?: string;
}

const FUNNEL_COLORS: Record<string, string> = {
  TOF: "bg-accent/20 text-accent border-accent/30",
  MOF: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  BOF: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function ContentPageInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "articles";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [posts, setPosts] = useState<PostEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/pipeline/config/post_index.json");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const filtered = search
    ? posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase()))
    : posts;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-lg text-text-primary">Content</h1>
        <p className="text-body-sm text-text-muted mt-1">Articles, pipeline agents, and content strategy.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border-ghost">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-body-sm font-medium transition-colors -mb-px",
              activeTab === tab.id
                ? "text-accent border-b-2 border-accent"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Articles tab */}
      {activeTab === "articles" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 max-w-sm px-3 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
            />
            <span className="font-mono text-caption text-text-muted">{filtered.length} articles</span>
          </div>

          <WidgetCard title="All Articles">
            {loading ? (
              <p className="text-body-sm text-text-muted py-4 animate-pulse">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-ghost">
                      <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest">Title</th>
                      <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-center">Funnel</th>
                      <th className="pb-3 font-mono text-caption text-text-muted uppercase tracking-widest text-right hidden sm:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-ghost/50">
                    {filtered.map(p => (
                      <tr key={p.slug} className="hover:bg-bg-low transition-colors">
                        <td className="py-3 text-body-sm text-text-body max-w-[300px] truncate">{p.title}</td>
                        <td className="py-3 text-center">
                          <span className={cn("inline-block px-2 py-0.5 rounded text-body-xs border", FUNNEL_COLORS[p.funnel_type] || "bg-bg-high text-text-muted")}>
                            {p.funnel_type}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-data text-text-muted text-right hidden sm:table-cell">{p.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </WidgetCard>
        </div>
      )}

      {/* Pipeline tab */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-display-sm text-text-primary">Agent Control</h2>
            <HumanPostDialog />
          </div>

          <WidgetCard title="Agents">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AGENTS.map(agent => (
                <div key={agent.workflow} className="bg-bg-low rounded-lg p-4 border border-border-ghost">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-body-sm text-text-primary font-medium">{agent.name}</p>
                    <AgentRunDialog workflow={agent.workflow} label={agent.name} />
                  </div>
                  <AgentLogs workflow={agent.workflow} />
                </div>
              ))}
            </div>
          </WidgetCard>

          <WidgetCard title="Pipeline Configuration">
            <PipelineConfigEditor />
          </WidgetCard>
        </div>
      )}

      {/* Strategy tab */}
      {activeTab === "strategy" && (
        <div className="space-y-6">
          <WidgetCard title="Funnel Schedule">
            <ScheduleEditor />
          </WidgetCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetCard title="Theme Weights">
              <ThemeWeightEditor />
            </WidgetCard>
            <WidgetCard title="Content Mix">
              <ContentMixEditor />
            </WidgetCard>
          </div>

          <WidgetCard title="AI Tells Blacklist">
            <AiTellsManager />
          </WidgetCard>
        </div>
      )}
    </div>
  );
}

export default function ContentPage() {
  return (
    <Suspense fallback={<div className="text-text-muted p-8">Loading...</div>}>
      <ContentPageInner />
    </Suspense>
  );
}
