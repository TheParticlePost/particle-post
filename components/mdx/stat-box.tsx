interface StatBoxProps {
  number: string;
  label: string;
  source?: string;
}

export function StatBox({ number, label, source }: StatBoxProps) {
  return (
    <aside className="relative my-8 rounded-md bg-bg-high border-l-4 border-accent pl-6 pr-5 py-6">
      <div className="font-display text-display-lg text-accent tabular-nums leading-none">
        {number}
      </div>
      <p className="mt-3 text-body-md text-text-primary leading-snug">
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
