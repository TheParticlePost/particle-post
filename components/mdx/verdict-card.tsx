interface VerdictCardProps {
  rating: "positive" | "negative" | "neutral";
  title: string;
  summary: string;
}

const ratingConfig = {
  positive: {
    borderColor: "border-l-green-500",
    badgeBg: "bg-green-500/15",
    badgeText: "text-green-400",
    label: "Positive",
  },
  negative: {
    borderColor: "border-l-red-500",
    badgeBg: "bg-red-500/15",
    badgeText: "text-red-400",
    label: "Negative",
  },
  neutral: {
    borderColor: "border-l-amber-500",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-400",
    label: "Neutral",
  },
};

export function VerdictCard({ rating, title, summary }: VerdictCardProps) {
  const config = ratingConfig[rating] || ratingConfig.neutral;

  return (
    <div
      className={`my-6 rounded border border-border-ghost bg-surface border-l-[3px] ${config.borderColor} p-5`}
    >
      {/* Rating badge */}
      <span
        className={`inline-block font-mono text-body-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded ${config.badgeBg} ${config.badgeText} mb-3`}
      >
        {config.label}
      </span>

      {/* Title */}
      <h4 className="font-display text-display-sm text-text-primary mb-2">
        {title}
      </h4>

      {/* Summary */}
      <p className="text-body-md text-text-secondary leading-relaxed">
        {summary}
      </p>
    </div>
  );
}
