import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
import { cn } from "@/lib/utils";
import type { RedFlag } from "@/lib/pulse/types";

interface PulseRedFlagsProps {
  flags: RedFlag[];
}

const severityStyles: Record<string, string> = {
  critical: "border-l-negative text-negative",
  high: "border-l-warning text-warning",
  medium: "border-l-info text-info",
  low: "border-l-text-muted text-text-muted",
};

const severityBg: Record<string, string> = {
  critical: "bg-negative/[0.08]",
  high: "bg-warning/[0.08]",
  medium: "bg-info/[0.08]",
  low: "bg-bg-high",
};

export function PulseRedFlags({ flags }: PulseRedFlagsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {flags.map((flag) => (
        <div
          key={flag.id}
          className={cn(
            "border-l-[3px] rounded-lg p-5",
            "border border-border-ghost",
            severityStyles[flag.severity],
            severityBg[flag.severity]
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-widest font-medium px-2 py-0.5 rounded-lg",
                severityStyles[flag.severity]
              )}
            >
              {flag.severity}
            </span>
            <DataText className="text-caption">{flag.date}</DataText>
          </div>
          <h4 className="font-display text-display-sm text-text-primary mb-2">
            {flag.title}
          </h4>
          <p className="text-body-sm text-text-secondary">{flag.description}</p>
          {flag.source && (
            <DataText as="p" className="mt-2 text-caption">
              Source: {flag.source}
            </DataText>
          )}
        </div>
      ))}
    </div>
  );
}
