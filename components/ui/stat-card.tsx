import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  accent = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-bg-container border border-border-ghost rounded-lg p-4",
        className
      )}
    >
      <p className="text-caption text-text-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-display-md tabular-nums font-bold",
          accent ? "text-accent" : "text-text-primary"
        )}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-caption text-text-muted mt-1">{subtitle}</p>
      )}
    </div>
  );
}
