import { cn } from "@/lib/utils";

interface CostLogEntry {
  timestamp: string;
  slot: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  successful_requests: number;
  verdict: string;
}

interface ApiCostsProps {
  logs: CostLogEntry[];
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ApiCosts({ logs }: ApiCostsProps) {
  if (logs.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-body-sm text-foreground-muted">
          No cost data yet. Costs are logged after each pipeline run.
        </p>
      </div>
    );
  }

  // Calculate aggregates
  const now = new Date();
  const thisMonth = logs.filter((l) => {
    const d = new Date(l.timestamp);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalCostMonth = thisMonth.reduce((s, l) => s + l.estimated_cost_usd, 0);
  const totalTokensMonth = thisMonth.reduce((s, l) => s + l.total_tokens, 0);
  const avgCostPerRun = thisMonth.length > 0 ? totalCostMonth / thisMonth.length : 0;

  const recentLogs = logs.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
          <p className="text-body-xs text-foreground-muted uppercase tracking-wider">
            This Month
          </p>
          <p className="text-display-sm font-display text-accent mt-1">
            {formatCost(totalCostMonth)}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
          <p className="text-body-xs text-foreground-muted uppercase tracking-wider">
            Avg / Run
          </p>
          <p className="text-display-sm font-display text-foreground mt-1">
            {formatCost(avgCostPerRun)}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
          <p className="text-body-xs text-foreground-muted uppercase tracking-wider">
            Tokens (Month)
          </p>
          <p className="text-display-sm font-display text-foreground mt-1">
            {formatTokens(totalTokensMonth)}
          </p>
        </div>
      </div>

      {/* Recent runs table */}
      <div className="overflow-x-auto">
        <table className="w-full text-body-xs">
          <thead>
            <tr className="border-b border-[var(--border)] text-foreground-muted">
              <th className="text-left py-2 font-medium">Date</th>
              <th className="text-left py-2 font-medium">Slot</th>
              <th className="text-right py-2 font-medium">Tokens</th>
              <th className="text-right py-2 font-medium">Cost</th>
              <th className="text-right py-2 font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((log, i) => (
              <tr
                key={`${log.timestamp}-${i}`}
                className="border-b border-[var(--border)]/50"
              >
                <td className="py-2 text-foreground-secondary">
                  {formatDate(log.timestamp)}
                </td>
                <td className="py-2 text-foreground-secondary capitalize">
                  {log.slot}
                </td>
                <td className="py-2 text-right text-foreground-secondary">
                  {formatTokens(log.total_tokens)}
                </td>
                <td className="py-2 text-right text-accent font-medium">
                  {formatCost(log.estimated_cost_usd)}
                </td>
                <td className="py-2 text-right">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-body-xs font-medium",
                      log.verdict === "APPROVE"
                        ? "bg-accent/12 text-accent"
                        : log.verdict === "REJECT"
                        ? "bg-red-500/12 text-red-400"
                        : "bg-foreground-muted/12 text-foreground-muted"
                    )}
                  >
                    {log.verdict || "N/A"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
