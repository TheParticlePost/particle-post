import { OverlineLabel } from "@/components/ui/overline-label";
import { cn } from "@/lib/utils";

interface TickerRow {
  symbol: string;
  price: string;
  change: number;
}

const PLACEHOLDER_DATA: TickerRow[] = [
  { symbol: "S&P 500", price: "5,234.18", change: 0.87 },
  { symbol: "NASDAQ", price: "16,428.82", change: 1.24 },
  { symbol: "BTC/USD", price: "68,421.30", change: -0.53 },
  { symbol: "EUR/USD", price: "1.0842", change: 0.12 },
  { symbol: "10Y UST", price: "4.28%", change: -0.03 },
];

interface MarketSnapshotProps {
  data?: TickerRow[];
}

export function MarketSnapshot({ data = PLACEHOLDER_DATA }: MarketSnapshotProps) {
  return (
    <div className="mb-8">
      <OverlineLabel className="mb-4 block">Market Snapshot</OverlineLabel>
      <div className="bg-bg-container border border-border-ghost rounded-lg overflow-hidden">
        {data.map((row, i) => (
          <div
            key={row.symbol}
            className={cn(
              "flex items-center justify-between px-4 py-3 font-mono text-data tabular-nums",
              i !== data.length - 1 && "border-b border-border-ghost"
            )}
          >
            <span className="text-text-secondary">{row.symbol}</span>
            <div className="flex items-center gap-3">
              <span className="text-text-primary">{row.price}</span>
              <span
                className={cn(
                  "text-caption font-medium min-w-[48px] text-right",
                  row.change > 0 ? "text-positive" : row.change < 0 ? "text-negative" : "text-text-muted"
                )}
              >
                {row.change > 0 ? "+" : ""}{row.change.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
