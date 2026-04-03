"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EventType = "POST" | "REJECTION" | "AGENT" | "FEEDBACK" | "REPORT" | "COST";
type FilterKey = "all" | "posts" | "agents" | "alerts";

interface ActivityEvent {
  type: EventType;
  message: string;
  timestamp: string;
  icon: "green" | "red" | "blue" | "amber" | "gray";
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const EVENT_DOT_COLORS: Record<string, string> = {
  green: "bg-emerald-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  gray: "bg-neutral-500",
};

const BADGE_STYLES: Record<EventType, { bg: string; text: string }> = {
  POST: { bg: "rgba(16, 185, 129, 0.12)", text: "#10b981" },
  REJECTION: { bg: "rgba(239, 68, 68, 0.12)", text: "#ef4444" },
  AGENT: { bg: "rgba(59, 130, 246, 0.12)", text: "#3b82f6" },
  FEEDBACK: { bg: "rgba(245, 158, 11, 0.12)", text: "#f59e0b" },
  REPORT: { bg: "rgba(59, 130, 246, 0.12)", text: "#3b82f6" },
  COST: { bg: "rgba(156, 163, 175, 0.12)", text: "#9ca3af" },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "posts", label: "Posts" },
  { key: "agents", label: "Agents" },
  { key: "alerts", label: "Alerts" },
];

const FILTER_TYPES: Record<FilterKey, EventType[] | null> = {
  all: null,
  posts: ["POST", "COST"],
  agents: ["AGENT", "REPORT"],
  alerts: ["REJECTION", "FEEDBACK"],
};

const REFRESH_INTERVAL = 60_000; // 60 seconds

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  if (isNaN(then)) return "";

  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 30) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface ActivityFeedProps {
  className?: string;
}

export function ActivityFeed({ className }: ActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity?limit=30");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } catch {
      // Network error — keep existing events
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchEvents, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Apply filter
  const allowedTypes = FILTER_TYPES[filter];
  const filtered = allowedTypes
    ? events.filter((e) => allowedTypes.includes(e.type))
    : events;

  return (
    <div className={className}>
      {/* Filter toggles */}
      <div className="flex items-center gap-1.5 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-2.5 py-1 rounded-md text-body-xs font-medium",
              "transition-colors duration-[180ms]",
              filter === f.key
                ? "bg-accent text-white"
                : "bg-bg-high text-text-muted hover:text-text-secondary"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Event list */}
      {loading && (
        <div className="py-6 text-center">
          <p className="text-body-sm text-text-muted">Loading activity...</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-body-sm text-text-muted">No activity recorded yet.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="divide-y divide-border-ghost">
          {filtered.map((event, i) => {
            const badgeStyle = BADGE_STYLES[event.type] ?? BADGE_STYLES.COST;
            const dotColor = EVENT_DOT_COLORS[event.icon] ?? EVENT_DOT_COLORS.gray;

            return (
              <li
                key={`${event.type}-${event.timestamp}-${i}`}
                className="py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  {/* Colored dot */}
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", dotColor)} />

                  {/* Badge + message */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-body-xs font-mono font-medium uppercase tracking-wide"
                        style={{
                          backgroundColor: badgeStyle.bg,
                          color: badgeStyle.text,
                        }}
                      >
                        {event.type}
                      </span>
                      <span className="text-body-sm text-text-secondary truncate">
                        {event.message}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span className="text-body-xs font-mono text-text-muted whitespace-nowrap shrink-0">
                    {relativeTime(event.timestamp)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
