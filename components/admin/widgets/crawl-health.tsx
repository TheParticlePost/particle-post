import { cn } from "@/lib/utils";

interface CrawlEntry {
  date: string;
  crawled: number;
  errors: number;
}

interface CrawlHealthProps {
  data: CrawlEntry[];
}

export function CrawlHealth({ data }: CrawlHealthProps) {
  if (data.length === 0) {
    return (
      <p className="text-body-sm text-foreground-muted text-center py-8">
        No crawl data available yet.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-4 text-foreground-muted font-medium">
                Date
              </th>
              <th className="text-right py-2 px-3 text-foreground-muted font-medium">
                Pages Crawled
              </th>
              <th className="text-right py-2 pl-3 text-foreground-muted font-medium">
                Errors
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.date}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="py-2.5 pr-4 text-foreground-secondary">
                  {row.date}
                </td>
                <td className="py-2.5 px-3 text-right text-foreground tabular-nums">
                  {row.crawled}
                </td>
                <td
                  className={cn(
                    "py-2.5 pl-3 text-right tabular-nums",
                    row.errors > 0 ? "text-red-400 font-medium" : "text-foreground-secondary"
                  )}
                >
                  {row.errors}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-body-xs text-foreground-muted mt-4">
        Data refreshed daily by Marketing Director agent at noon ET
      </p>
    </div>
  );
}
