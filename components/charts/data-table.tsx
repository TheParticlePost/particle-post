import { cn } from "@/lib/utils";

interface Column {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  format?: "number" | "currency" | "percent" | "text";
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, any>[];
  className?: string;
}

function formatValue(value: any, format?: string): string {
  if (value == null) return "—";
  switch (format) {
    case "currency":
      return `$${Number(value).toLocaleString()}`;
    case "percent":
      return `${Number(value).toFixed(1)}%`;
    case "number":
      return Number(value).toLocaleString();
    default:
      return String(value);
  }
}

function isNumericFormat(format?: string): boolean {
  return format === "number" || format === "currency" || format === "percent";
}

export function DataTable({ columns, data, className }: DataTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "font-mono text-caption font-medium uppercase tracking-wider text-text-muted",
                  "px-4 py-3 border-b-2 border-border-ghost",
                  col.align === "right" ? "text-right" : "text-left"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-bg-base" : "bg-bg-low"}
            >
              {columns.map((col) => {
                const val = row[col.key];
                const isNeg = typeof val === "number" && val < 0;
                const isPos = typeof val === "number" && val > 0;

                return (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 border-b border-border-ghost",
                      isNumericFormat(col.format)
                        ? "font-mono text-data tabular-nums"
                        : "text-body-sm",
                      col.align === "right" ? "text-right" : "text-left",
                      isPos && col.format === "percent" && "text-positive",
                      isNeg && col.format === "percent" && "text-negative"
                    )}
                  >
                    {formatValue(val, col.format)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
