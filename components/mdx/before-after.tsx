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
    <div className="my-6">
      {/* Metric label */}
      <p className="text-body-xs font-mono uppercase tracking-wider text-text-muted mb-3">
        {metric}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        {/* Before card */}
        <div className="rounded border border-red-500/30 bg-surface p-5">
          <p className="text-body-xs font-mono uppercase tracking-wider text-red-400 mb-2">
            Before
          </p>
          <p className="font-display text-display-md text-text-primary">
            {before}
          </p>
        </div>

        {/* Arrow / delta */}
        <div className="flex items-center justify-center sm:flex-col">
          <div className="hidden sm:block text-text-muted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
          <div className="sm:hidden text-text-muted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="m5 12 7 7 7-7" />
            </svg>
          </div>
          {deltaPercent !== null && (
            <span
              className={`font-mono text-body-sm font-semibold ml-2 sm:ml-0 sm:mt-1 ${
                deltaPercent >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {deltaPercent >= 0 ? "+" : ""}
              {deltaPercent}%
            </span>
          )}
        </div>

        {/* After card */}
        <div className="rounded border border-green-500/30 bg-surface p-5">
          <p className="text-body-xs font-mono uppercase tracking-wider text-green-400 mb-2">
            After
          </p>
          <p className="font-display text-display-md text-text-primary">
            {after}
          </p>
        </div>
      </div>

      {source && (
        <p className="mt-3 text-body-xs text-text-muted">
          Source: {source}
        </p>
      )}
    </div>
  );
}
