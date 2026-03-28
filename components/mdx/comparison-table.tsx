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
    <div className="my-6 overflow-x-auto rounded-lg border border-border-ghost">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="bg-bg-high/50">
            {parsedHeaders.map((h, i) => (
              <th
                key={i}
                className="text-left px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-body-xs"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parsedRows.map((row, i) => (
            <tr key={i} className="border-t border-border-ghost">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-text-primary">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {source && (
        <div className="px-4 py-2 border-t border-border-ghost bg-bg-high/30">
          <p className="text-body-xs text-text-muted">Source: {source}</p>
        </div>
      )}
    </div>
  );
}
