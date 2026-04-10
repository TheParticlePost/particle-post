interface StatBoxProps {
  // The pipeline writes shortcodes with either `number=` or `value=`
  // (historical drift). Accept both so neither silently drops the stat.
  number?: string;
  value?: string;
  label: string;
  source?: string;
}

export function StatBox({ number, value, label, source }: StatBoxProps) {
  const stat = (number ?? value ?? "").trim();
  const hasStat = stat.length > 0;

  return (
    <aside className="relative my-8 rounded-md bg-bg-high border-l-4 border-accent pl-6 pr-5 py-6">
      {hasStat && (
        <div className="font-display text-display-lg text-accent tabular-nums leading-none">
          {stat}
        </div>
      )}
      <p className={`${hasStat ? "mt-3" : ""} text-body-md text-text-primary leading-snug`}>
        {label}
      </p>
      {source && (
        <p className="mt-4 pt-3 border-t border-border-ghost text-caption font-mono uppercase tracking-wider text-text-muted">
          Source: {source}
        </p>
      )}
    </aside>
  );
}
