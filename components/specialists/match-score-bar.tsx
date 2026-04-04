import { cn } from "@/lib/utils";

interface MatchScoreBarProps {
  score: number; // 0-100
  className?: string;
}

export function MatchScoreBar({ score, className }: MatchScoreBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-2 bg-bg-high rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="font-mono text-data tabular-nums text-text-secondary shrink-0">
        {score}%
      </span>
    </div>
  );
}
