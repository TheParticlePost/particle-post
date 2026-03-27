import { cn } from "@/lib/utils";

interface MarketingLogEntry {
  date: string;
  content: string;
}

interface MarketingLogProps {
  logs: MarketingLogEntry[];
  className?: string;
}

function renderMarkdownLine(line: string): React.ReactNode {
  // Bold
  let processed = line.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="text-foreground font-semibold">$1</strong>'
  );
  // Inline code
  processed = processed.replace(
    /`(.+?)`/g,
    '<code class="px-1 py-0.5 rounded bg-accent/10 text-accent text-body-xs font-mono">$1</code>'
  );
  // Links
  processed = processed.replace(
    /\[(.+?)\]\((.+?)\)/g,
    '<a href="$2" class="text-accent hover:text-accent-hover underline" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return <span dangerouslySetInnerHTML={{ __html: processed }} />;
}

function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];

  function flushTable() {
    if (tableHeaders.length > 0) {
      elements.push(
        <div
          key={`table-${elements.length}`}
          className="overflow-x-auto my-3 rounded-lg border border-[var(--border)]"
        >
          <table className="w-full text-body-xs">
            <thead>
              <tr className="bg-[var(--bg-tertiary)]">
                {tableHeaders.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left text-foreground-muted font-medium uppercase tracking-wider"
                  >
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-t border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                >
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-foreground">
                      {renderMarkdownLine(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableHeaders = [];
    tableRows = [];
    inTable = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      // Check if next line is separator
      if (!inTable) {
        const nextLine = lines[i + 1]?.trim() ?? "";
        if (nextLine.startsWith("|") && nextLine.includes("---")) {
          tableHeaders = cells;
          inTable = true;
          i++; // skip separator
          continue;
        }
      }

      if (inTable) {
        tableRows.push(cells);
        continue;
      }
    } else if (inTable) {
      flushTable();
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4
          key={i}
          className="text-body-sm font-semibold text-foreground mt-4 mb-1"
        >
          {trimmed.slice(4)}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3
          key={i}
          className="text-body-md font-display text-foreground mt-4 mb-1"
        >
          {trimmed.slice(3)}
        </h3>
      );
      continue;
    }

    // Horizontal rule
    if (trimmed === "---") {
      elements.push(
        <hr
          key={i}
          className="border-t border-[var(--border)] my-3"
        />
      );
      continue;
    }

    // Empty line
    if (trimmed === "") {
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-body-sm text-foreground-secondary leading-relaxed">
        {renderMarkdownLine(trimmed)}
      </p>
    );
  }

  if (inTable) flushTable();

  return <>{elements}</>;
}

function formatLogDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T12:00:00Z");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function MarketingLog({ logs, className }: MarketingLogProps) {
  if (logs.length === 0) {
    return (
      <div className={cn("text-foreground-muted text-body-sm", className)}>
        No marketing reports available yet.
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {logs.map((log) => (
        <div key={log.date}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <h3 className="font-display text-body-md text-foreground">
              {formatLogDate(log.date)}
            </h3>
          </div>
          <div
            className={cn(
              "rounded-xl p-4",
              "bg-[var(--bg-secondary)] border border-[var(--border)]",
              "max-h-[500px] overflow-y-auto scrollbar-hide"
            )}
          >
            {renderMarkdown(log.content)}
          </div>
        </div>
      ))}
    </div>
  );
}
