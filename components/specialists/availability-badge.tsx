import { cn } from "@/lib/utils";

interface AvailabilityBadgeProps {
  available: boolean;
  className?: string;
}

export function AvailabilityBadge({ available, className }: AvailabilityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-data tabular-nums",
        available ? "text-[#2D9B5A]" : "text-text-muted",
        className
      )}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          available ? "bg-[#2D9B5A]" : "bg-text-muted"
        )}
      />
      {available ? "Available" : "Unavailable"}
    </span>
  );
}
