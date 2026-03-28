import { cn } from "@/lib/utils";

interface StrategyViewerProps {
  data: Record<string, unknown>;
  className?: string;
}

function renderValue(value: unknown, depth: number = 0): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-text-muted italic">N/A</span>;
  }

  if (typeof value === "boolean") {
    return (
      <span className={cn(value ? "text-accent" : "text-red-400")}>
        {value ? "Yes" : "No"}
      </span>
    );
  }

  if (typeof value === "number") {
    return <span className="text-accent font-mono">{value}</span>;
  }

  if (typeof value === "string") {
    return <span className="text-text-primary">{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-text-muted italic">Empty</span>;
    }
    // Simple string/number arrays render as inline tags
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {value.map((item, i) => (
            <span
              key={i}
              className={cn(
                "inline-block px-2 py-0.5 rounded-md text-body-xs",
                "bg-accent/10 text-accent border border-accent/20"
              )}
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    // Complex arrays render as nested blocks
    return (
      <div className="space-y-2 mt-1">
        {value.map((item, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg p-3",
              "bg-bg-base border border-border-ghost"
            )}
          >
            {typeof item === "object" && item !== null ? (
              renderObject(item as Record<string, unknown>, depth + 1)
            ) : (
              <span className="text-body-sm text-text-primary">
                {String(item)}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    return renderObject(value as Record<string, unknown>, depth + 1);
  }

  return <span className="text-text-primary">{String(value)}</span>;
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderObject(
  obj: Record<string, unknown>,
  depth: number = 0
): React.ReactNode {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return <span className="text-text-muted italic">Empty</span>;
  }

  return (
    <div className={cn("space-y-3", depth > 0 && "ml-2 mt-1")}>
      {entries.map(([key, val]) => (
        <div key={key}>
          <p className="text-body-xs text-text-muted font-medium uppercase tracking-wider">
            {formatKey(key)}
          </p>
          <div className="mt-0.5">{renderValue(val, depth)}</div>
        </div>
      ))}
    </div>
  );
}

export function StrategyViewer({ data, className }: StrategyViewerProps) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className={cn("text-text-muted text-body-sm", className)}>
        No data available yet.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>{renderObject(data)}</div>
  );
}
