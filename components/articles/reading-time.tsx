import { cn } from "@/lib/utils";

interface ReadingTimeProps {
  minutes: number;
  className?: string;
}

export function ReadingTime({ minutes, className }: ReadingTimeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 bg-bg-high rounded-lg px-2.5 py-0.5",
        "font-mono text-[10px] uppercase tracking-widest tabular-nums text-text-secondary",
        className
      )}
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      {minutes} min read
    </span>
  );
}
