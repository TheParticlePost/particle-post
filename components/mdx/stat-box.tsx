interface StatBoxProps {
  number: string;
  label: string;
  source?: string;
}

export function StatBox({ number, label, source }: StatBoxProps) {
  return (
    <div className="my-6 p-5 rounded-lg border border-accent/20 bg-accent/5 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative">
        <div className="font-display text-display-md text-accent mb-1">
          {number}
        </div>
        <p className="text-body-md text-text-secondary leading-relaxed">
          {label}
        </p>
        {source && (
          <p className="mt-2 text-body-xs text-text-muted">
            Source: {source}
          </p>
        )}
      </div>
    </div>
  );
}
