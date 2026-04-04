"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DataText } from "@/components/ui/data-text";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/specialists/tag-badge";
import type { SpecialistLead } from "@/lib/specialists/types";

const STATUS_COLORS: Record<string, string> = {
  new: "#E8552E",
  viewed: "#D4962A",
  responded: "#2D9B5A",
  archived: "#6E6660",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  new: "bg-accent",
  viewed: "bg-[#D4962A]",
  responded: "bg-[#2D9B5A]",
  archived: "bg-text-muted",
};

interface LeadCardProps {
  lead: SpecialistLead;
  onStatusChange: (id: string, status: string) => void;
  updating?: boolean;
}

export function LeadCard({ lead, onStatusChange, updating }: LeadCardProps) {
  const [expanded, setExpanded] = useState(false);

  const timeAgo = getRelativeTime(lead.created_at);

  return (
    <div
      className={cn(
        "bg-bg-container border border-border-ghost rounded-lg p-4 transition-colors",
        lead.status === "new" && "editorial-stripe"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              STATUS_DOT_COLORS[lead.status]
            )}
          />
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-left min-w-0"
          >
            <span className="font-display font-bold text-body-md text-text-primary">
              {lead.client_name}
            </span>
            {lead.client_company && (
              <span className="text-text-secondary text-body-sm ml-1.5">
                at {lead.client_company}
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TagBadge
            label={lead.status}
            color={STATUS_COLORS[lead.status]}
            size="sm"
          />
          <DataText>{timeAgo}</DataText>
        </div>
      </div>

      {/* Preview */}
      <p className="text-body-sm text-text-secondary mt-2 line-clamp-2">
        {lead.project_description}
      </p>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border-ghost space-y-3">
          <div>
            <p className="text-caption text-text-muted uppercase tracking-wide mb-1">
              Email
            </p>
            <a
              href={`mailto:${lead.client_email}`}
              className="text-body-sm text-accent hover:underline"
            >
              {lead.client_email}
            </a>
          </div>
          <div>
            <p className="text-caption text-text-muted uppercase tracking-wide mb-1">
              Project Description
            </p>
            <p className="text-body-sm text-text-body whitespace-pre-line">
              {lead.project_description}
            </p>
          </div>
          {lead.budget_range && (
            <div>
              <p className="text-caption text-text-muted uppercase tracking-wide mb-1">
                Budget
              </p>
              <DataText>{lead.budget_range}</DataText>
            </div>
          )}
          {lead.timeline && (
            <div>
              <p className="text-caption text-text-muted uppercase tracking-wide mb-1">
                Timeline
              </p>
              <DataText>{lead.timeline}</DataText>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {lead.status === "new" && (
              <Button
                variant="primary"
                size="compact"
                disabled={updating}
                onClick={() => onStatusChange(lead.id, "viewed")}
              >
                Mark Viewed
              </Button>
            )}
            {(lead.status === "new" || lead.status === "viewed") && (
              <Button
                variant="secondary"
                size="compact"
                disabled={updating}
                onClick={() => onStatusChange(lead.id, "responded")}
              >
                Mark Responded
              </Button>
            )}
            {lead.status !== "archived" && (
              <Button
                variant="ghost"
                size="compact"
                disabled={updating}
                onClick={() => onStatusChange(lead.id, "archived")}
              >
                Archive
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
