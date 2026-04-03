"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { WidgetCard } from "@/components/admin/widget-card";

interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
  html_url?: string;
}

interface AgentLogsProps {
  workflow: string;
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return "--";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === "in_progress" || status === "queued") {
    return (
      <span className="flex items-center gap-1.5 text-body-xs font-medium text-yellow-400">
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        Running
      </span>
    );
  }

  if (conclusion === "success") {
    return (
      <span className="flex items-center gap-1.5 text-body-xs font-medium text-green-400">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Success
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-body-xs font-medium text-red-400">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
      {conclusion ?? "Failed"}
    </span>
  );
}

export function AgentLogs({ workflow }: AgentLogsProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchRuns = useCallback(async () => {
    try {
      const resp = await fetch(
        `/api/agents/runs?workflow=${encodeURIComponent(workflow)}&limit=5`
      );
      if (!resp.ok) throw new Error("Failed to fetch runs");
      const data = await resp.json();
      setRuns(data.runs ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [workflow]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const toggleExpand = async (runId: number) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      setLogs("");
      return;
    }

    setExpandedRunId(runId);
    setLogsLoading(true);
    setLogs("");

    try {
      const resp = await fetch(`/api/agents/runs/${runId}/logs`);
      if (!resp.ok) throw new Error("Failed to fetch logs");
      const data = await resp.json();
      setLogs(typeof data.logs === "string" ? data.logs : JSON.stringify(data.logs, null, 2));
    } catch (err) {
      setLogs(`Error loading logs: ${err}`);
    } finally {
      setLogsLoading(false);
    }
  };

  const title = workflow.replace(".yml", "").replace(/-/g, " ");
  const displayTitle = title.charAt(0).toUpperCase() + title.slice(1) + " Runs";

  if (loading) {
    return (
      <WidgetCard title={displayTitle}>
        <div className="py-6 text-center">
          <p className="text-body-sm text-text-muted">Loading runs...</p>
        </div>
      </WidgetCard>
    );
  }

  if (error) {
    return (
      <WidgetCard title={displayTitle}>
        <div className="py-6 text-center">
          <p className="text-body-sm text-red-400">{error}</p>
        </div>
      </WidgetCard>
    );
  }

  if (runs.length === 0) {
    return (
      <WidgetCard title={displayTitle}>
        <div className="py-6 text-center">
          <p className="text-body-sm text-text-muted">No recent runs found.</p>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title={displayTitle}>
      <ul className="divide-y divide-border-ghost">
        {runs.map((run) => {
          const isExpanded = expandedRunId === run.id;
          const startTime = run.run_started_at ?? run.created_at;
          const duration =
            run.status === "completed"
              ? formatDuration(startTime, run.updated_at)
              : "--";

          return (
            <li key={run.id} className="py-2.5 first:pt-0 last:pb-0">
              <button
                onClick={() => toggleExpand(run.id)}
                className={cn(
                  "w-full flex items-center justify-between gap-3 text-left",
                  "rounded-md px-2 py-1 -mx-2",
                  "transition-colors duration-[180ms]",
                  "hover:bg-bg-low",
                  isExpanded && "bg-bg-low"
                )}
              >
                <StatusBadge status={run.status} conclusion={run.conclusion} />
                <span className="flex-1 text-body-xs font-mono text-text-muted text-right">
                  {formatTimestamp(startTime)}
                </span>
                <span className="text-body-xs font-mono text-text-muted w-14 text-right">
                  {duration}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={cn(
                    "text-text-muted transition-transform duration-[180ms]",
                    isExpanded && "rotate-180"
                  )}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isExpanded && (
                <div className="mt-2 rounded-lg bg-bg-high border border-border-ghost p-3 max-h-64 overflow-auto">
                  {logsLoading ? (
                    <p className="text-body-xs text-text-muted">Loading logs...</p>
                  ) : (
                    <pre className="text-body-xs font-mono text-text-secondary whitespace-pre-wrap break-words leading-relaxed">
                      {logs || "No logs available."}
                    </pre>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
