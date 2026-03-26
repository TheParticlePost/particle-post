interface ComparisonTableProps {
  headers: string; // JSON string: ["Col1", "Col2", ...]
  rows: string; // JSON string: [["a", "b"], ["c", "d"]]
  source?: string;
}

export function ComparisonTable({ headers, rows, source }: ComparisonTableProps) {
  let parsedHeaders: string[] = [];
  let parsedRows: string[][] = [];
  try {
    parsedHeaders = JSON.parse(headers);
    parsedRows = JSON.parse(rows);
  } catch {
    return null;
  }

  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="bg-bg-tertiary/50">
            {parsedHeaders.map((h, i) => (
              <th
                key={i}
                className="text-left px-4 py-3 font-semibold text-foreground-secondary uppercase tracking-wider text-body-xs"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parsedRows.map((row, i) => (
            <tr key={i} className="border-t border-[var(--border)]">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {source && (
        <div className="px-4 py-2 border-t border-[var(--border)] bg-bg-tertiary/30">
          <p className="text-body-xs text-foreground-muted">Source: {source}</p>
        </div>
      )}
    </div>
  );
}
