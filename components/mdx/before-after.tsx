interface BeforeAfterProps {
  metric: string;
  before: string;
  after: string;
  source?: string;
}

export function BeforeAfter({ metric, before, after, source }: BeforeAfterProps) {
  // Try to compute delta if both values are numeric
  const numBefore = parseFloat(before.replace(/[^0-9.-]/g, ""));
  const numAfter = parseFloat(after.replace(/[^0-9.-]/g, ""));
  const hasDelta = !isNaN(numBefore) && !isNaN(numAfter) && numBefore !== 0;
  const deltaPercent = hasDelta
    ? Math.round(((numAfter - numBefore) / Math.abs(numBefore)) * 100)
    : null;

  return (
    <figure className="my-8">
      {/* Metric label */}
      <p className="text-caption font-mono uppercase tracking-wider text-text-muted mb-4">
        {metric}
      </p>

      {/* Two equal columns — no center arrow column. Stacks on mobile
          AND on narrow article-width viewports. `min-w-0` on grid cells
          prevents long values from forcing the container wider than its
          parent .prose column. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Before card */}
        <div className="min-w-0 rounded-md border border-red-500/40 bg-bg-high p-5">
          <p className="text-caption font-mono uppercase tracking-wider text-red-400 mb-2">
            Before
          </p>
          <p className="font-display text-display-md text-text-primary break-words hyphens-auto">
            {before}
          </p>
        </div>

        {/* After card */}
        <div className="relative min-w-0 rounded-md border border-green-500/40 bg-bg-high p-5">
          <p className="text-caption font-mono uppercase tracking-wider text-green-400 mb-2">
            After
          </p>
          <p className="font-display text-display-md text-text-primary break-words hyphens-auto pr-14">
            {after}
          </p>
          {deltaPercent !== null && (
            <span
              className={`absolute top-5 right-5 font-mono text-body-sm font-semibold tabular-nums ${
                deltaPercent >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {deltaPercent >= 0 ? "+" : ""}
              {deltaPercent}%
            </span>
          )}
        </div>
      </div>

      {source && (
        <figcaption className="mt-4 text-caption font-mono uppercase tracking-wider text-text-muted">
          Source: {source}
        </figcaption>
      )}
    </figure>
  );
}
