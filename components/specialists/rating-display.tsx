import { cn } from "@/lib/utils";

interface RatingDisplayProps {
  rating: number;
  count?: number;
  className?: string;
}

export function RatingDisplay({ rating, count, className }: RatingDisplayProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={star <= Math.round(rating) ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            className={cn(
              star <= Math.round(rating) ? "text-accent" : "text-text-muted"
            )}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </span>
      {rating > 0 && (
        <span className="font-mono text-data tabular-nums text-text-secondary">
          {rating.toFixed(1)}
          {count !== undefined && (
            <span className="text-text-muted"> ({count})</span>
          )}
        </span>
      )}
    </span>
  );
}
