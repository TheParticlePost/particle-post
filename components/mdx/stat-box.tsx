interface StatBoxProps {
  // The pipeline writes shortcodes with either `number=` or `value=`
  // (historical drift). Accept both so neither silently drops the stat.
  number?: string;
  value?: string;
  label: string;
  source?: string;
}

/**
 * Centered big-number stat callout. Used inside MDX article bodies via the
 * {{< stat-box >}} Hugo shortcode. Theme-adaptive — background + text colors
 * come from CSS variables defined in app/globals.css, so the component works
 * on both light and dark pages.
 *
 * Visual treatment: ghost border all around (no left stripe), centered
 * contents (number, label, source), generous vertical padding so the number
 * and label are visually balanced.
 */
export function StatBox({ number, value, label, source }: StatBoxProps) {
  const stat = (number ?? value ?? "").trim();
  const hasStat = stat.length > 0;

  return (
    <aside className="relative my-8 rounded-md bg-bg-high border border-border-ghost px-6 py-8 text-center">
      {hasStat && (
        <div className="font-display text-display-lg text-accent tabular-nums leading-none">
          {stat}
        </div>
      )}
      <p className={`${hasStat ? "mt-4" : ""} text-body-md text-text-primary leading-snug mx-auto max-w-prose`}>
        {label}
      </p>
      {source && (
        <p className="mt-5 pt-4 border-t border-border-ghost text-caption font-mono uppercase tracking-wider text-text-muted">
          Source: {source}
        </p>
      )}
    </aside>
  );
}
