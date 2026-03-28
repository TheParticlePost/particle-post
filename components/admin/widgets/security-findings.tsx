"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Finding {
  severity: string;
  category: string;
  title: string;
  detail: string;
  file_path?: string;
  auto_fixable?: boolean;
  fixed?: boolean;
}

interface SecurityFindingsProps {
  findings: Finding[];
  className?: string;
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-bg-high text-text-muted border-border-ghost",
};

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-gray-500",
};

export function SecurityFindings({
  findings,
  className,
}: SecurityFindingsProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["CRITICAL", "HIGH"])
  );
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  if (findings.length === 0) {
    return (
      <div className={cn("text-text-muted text-body-sm", className)}>
        No findings to display.
      </div>
    );
  }

  // Group by severity
  const grouped = findings.reduce<Record<string, Finding[]>>((acc, finding) => {
    const sev = finding.severity.toUpperCase();
    if (!acc[sev]) acc[sev] = [];
    acc[sev].push(finding);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => (SEVERITY_ORDER[a] ?? 99) - (SEVERITY_ORDER[b] ?? 99)
  );

  function toggleGroup(severity: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return next;
    });
  }

  function toggleItem(index: number) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  // We need a global index for expand/collapse
  let globalIdx = 0;

  return (
    <div className={cn("space-y-3", className)}>
      {sortedGroups.map(([severity, items]) => {
        const isExpanded = expandedGroups.has(severity);
        const startIdx = globalIdx;
        globalIdx += items.length;

        return (
          <div
            key={severity}
            className="rounded-lg border border-border-ghost overflow-hidden"
          >
            {/* Group header */}
            <button
              onClick={() => toggleGroup(severity)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3",
                "bg-bg-low hover:bg-bg-high",
                "transition-colors duration-200 text-left"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    SEVERITY_DOT[severity] ?? "bg-gray-500"
                  )}
                />
                <span className="text-body-sm font-medium text-text-primary">
                  {severity}
                </span>
                <span className="text-body-xs text-text-muted">
                  ({items.length})
                </span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "text-text-muted transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Group body */}
            {isExpanded && (
              <div className="divide-y divide-[var(--border)]">
                {items.map((finding, i) => {
                  const itemIdx = startIdx + i;
                  const isItemExpanded = expandedItems.has(itemIdx);

                  return (
                    <div key={itemIdx} className="bg-bg-base">
                      <button
                        onClick={() => toggleItem(itemIdx)}
                        className="w-full flex items-start justify-between px-4 py-3 hover:bg-bg-low transition-colors duration-200 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={cn(
                                "inline-block px-1.5 py-0.5 rounded text-body-xs border",
                                SEVERITY_STYLES[severity] ??
                                  "bg-bg-high text-text-primary"
                              )}
                            >
                              {finding.category}
                            </span>
                            {finding.fixed && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-body-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Fixed
                              </span>
                            )}
                          </div>
                          <p className="text-body-sm text-text-primary">
                            {finding.title}
                          </p>
                        </div>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={cn(
                            "text-text-muted transition-transform duration-200 shrink-0 mt-1 ml-2",
                            isItemExpanded && "rotate-180"
                          )}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {isItemExpanded && (
                        <div className="px-4 pb-3 space-y-2">
                          <p className="text-body-xs text-text-secondary leading-relaxed">
                            {finding.detail}
                          </p>
                          {finding.file_path && (
                            <p className="text-body-xs text-text-muted">
                              File:{" "}
                              <code className="text-accent font-mono">
                                {finding.file_path}
                              </code>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
