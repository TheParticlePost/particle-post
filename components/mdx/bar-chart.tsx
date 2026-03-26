interface BarChartProps {
  title?: string;
  data: string; // JSON string: [{"label": "A", "value": 50}, ...]
  source?: string;
}

interface DataPoint {
  label: string;
  value: number;
}

export function BarChart({ title, data, source }: BarChartProps) {
  let parsed: DataPoint[] = [];
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }

  const maxValue = Math.max(...parsed.map((d) => d.value));

  return (
    <div className="my-6 p-5 rounded-xl border border-[var(--border)] bg-surface">
      {title && (
        <h4 className="font-display text-display-sm mb-4">{title}</h4>
      )}

      <div className="space-y-3">
        {parsed.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-foreground-secondary">{item.label}</span>
              <span className="font-mono text-accent">{item.value}</span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {source && (
        <p className="mt-3 text-body-xs text-foreground-muted">
          Source: {source}
        </p>
      )}
    </div>
  );
}
