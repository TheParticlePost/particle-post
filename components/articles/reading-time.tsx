import { cn } from "@/lib/utils";

interface ReadingTimeProps {
  minutes: number;
  className?: string;
}

export function ReadingTime({ minutes, className }: ReadingTimeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-data tabular-nums text-text-muted",
        className
      )}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      {minutes} min read
    </span>
  );
}
