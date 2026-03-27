"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn, formatDateShort } from "@/lib/utils";

interface PostRow {
  slug: string;
  title: string;
  date: string;
  category: string;
  funnel_type: string;
  schema_type: string;
}

interface PostsTableProps {
  posts: PostRow[];
}

type SortKey = "title" | "date" | "category" | "funnel_type" | "schema_type";
type SortDir = "asc" | "desc";

const FUNNEL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  TOF: { bg: "rgba(59, 130, 246, 0.12)", text: "#3b82f6", label: "TOF" },
  MOF: { bg: "rgba(245, 158, 11, 0.12)", text: "#f59e0b", label: "MOF" },
  BOF: { bg: "rgba(0, 212, 170, 0.12)", text: "#00d4aa", label: "BOF" },
};

function FunnelBadge({ type }: { type: string }) {
  const config = FUNNEL_COLORS[type] ?? {
    bg: "rgba(156, 163, 175, 0.12)",
    text: "#9ca3af",
    label: type,
  };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-body-xs font-medium shrink-0"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={cn(
        "ml-1 inline-block transition-opacity",
        active ? "opacity-100" : "opacity-30"
      )}
    >
      <path
        d="M6 2L9 5H3L6 2Z"
        fill="currentColor"
        className={active && dir === "asc" ? "opacity-100" : "opacity-30"}
      />
      <path
        d="M6 10L3 7H9L6 10Z"
        fill="currentColor"
        className={active && dir === "desc" ? "opacity-100" : "opacity-30"}
      />
    </svg>
  );
}

export function PostsTable({ posts }: PostsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [funnelFilter, setFunnelFilter] = useState<string>("all");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  };

  const filtered = useMemo(() => {
    let result = posts;
    if (funnelFilter !== "all") {
      result = result.filter((p) => p.funnel_type === funnelFilter);
    }
    return result;
  }, [posts, funnelFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        cmp = (a[sortKey] ?? "").localeCompare(b[sortKey] ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const funnelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: posts.length };
    for (const p of posts) {
      counts[p.funnel_type] = (counts[p.funnel_type] ?? 0) + 1;
    }
    return counts;
  }, [posts]);

  if (posts.length === 0) {
    return (
      <p className="text-body-sm text-foreground-muted py-4">
        No posts found.
      </p>
    );
  }

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "title", label: "Title", className: "text-left" },
    { key: "date", label: "Date", className: "text-left hidden sm:table-cell" },
    { key: "category", label: "Category", className: "text-left hidden md:table-cell" },
    { key: "funnel_type", label: "Funnel", className: "text-center" },
    { key: "schema_type", label: "Schema", className: "text-left hidden lg:table-cell" },
  ];

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        {["all", "TOF", "MOF", "BOF"].map((f) => (
          <button
            key={f}
            onClick={() => setFunnelFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-body-xs font-medium transition-colors duration-200",
              funnelFilter === f
                ? "bg-accent/15 text-accent"
                : "bg-[var(--bg-secondary)] text-foreground-muted hover:text-foreground hover:bg-[var(--bg-tertiary)]"
            )}
          >
            {f === "all" ? "All" : f}{" "}
            <span className="opacity-60">({funnelCounts[f] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "pb-3 pr-4 font-medium text-foreground-muted cursor-pointer select-none",
                    col.className
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon active={sortKey === col.key} dir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sorted.map((post) => (
              <tr
                key={post.slug}
                className="group hover:bg-[var(--bg-secondary)] transition-colors duration-150"
              >
                <td className="py-3 pr-4 max-w-[300px]">
                  <Link
                    href={`/posts/${post.slug}/`}
                    className={cn(
                      "text-body-sm font-medium text-foreground",
                      "hover:text-accent transition-colors duration-200",
                      "line-clamp-2"
                    )}
                  >
                    {post.title}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-foreground-muted whitespace-nowrap hidden sm:table-cell">
                  {formatDateShort(post.date)}
                </td>
                <td className="py-3 pr-4 text-foreground-muted hidden md:table-cell">
                  <span className="inline-block max-w-[140px] truncate">
                    {post.category || "Uncategorized"}
                  </span>
                </td>
                <td className="py-3 pr-4 text-center">
                  <FunnelBadge type={post.funnel_type} />
                </td>
                <td className="py-3 text-foreground-muted hidden lg:table-cell">
                  {post.schema_type || "Article"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Count */}
      <p className="text-body-xs text-foreground-muted">
        Showing {sorted.length} of {posts.length} posts
      </p>
    </div>
  );
}
