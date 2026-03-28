import { OverlineLabel } from "@/components/ui/overline-label";
import { cn } from "@/lib/utils";

interface SignalRow {
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
}

const AI_SIGNALS: SignalRow[] = [
  { label: "Enterprise AI Adoption", value: "78%", trend: "up" },
  { label: "Global AI Market", value: "$200B+", trend: "up" },
  { label: "Avg Implementation", value: "8 months", trend: "down" },
  { label: "AI Job Postings", value: "+340% YoY", trend: "up" },
  { label: "Open Source Share", value: "62%", trend: "up" },
];

interface MarketSnapshotProps {
  data?: SignalRow[];
}

export function MarketSnapshot({ data = AI_SIGNALS }: MarketSnapshotProps) {
  return (
    <div className="mb-8">
      <OverlineLabel className="mb-4 block">AI Industry Pulse</OverlineLabel>
      <div className="bg-bg-container border border-border-ghost rounded-lg overflow-hidden">
        {data.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              "flex items-center justify-between px-4 py-3 font-mono text-data tabular-nums",
              i !== data.length - 1 && "border-b border-border-ghost"
            )}
          >
            <span className="text-text-secondary">{row.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-text-primary font-medium">{row.value}</span>
              <span className={cn(
                "text-[10px]",
                row.trend === "up" ? "text-positive" : row.trend === "down" ? "text-negative" : "text-text-muted"
              )}>
                {row.trend === "up" ? "▲" : row.trend === "down" ? "▼" : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
