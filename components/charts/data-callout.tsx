import { cn } from "@/lib/utils";

interface DataCalloutProps {
  value: string;
  label: string;
  sublabel?: string;
  accent?: boolean;
  className?: string;
}

export function DataCallout({
  value,
  label,
  sublabel,
  accent = false,
  className,
}: DataCalloutProps) {
  return (
    <div
      className={cn(
        "bg-bg-container border border-border-ghost rounded-lg p-6",
        className
      )}
    >
      <p
        className={cn(
          "font-mono text-4xl font-medium tabular-nums",
          accent ? "text-accent" : "text-text-primary"
        )}
      >
        {value}
      </p>
      <p className="text-body-sm text-text-secondary mt-2">{label}</p>
      {sublabel && (
        <p className="font-mono text-caption text-text-muted mt-1">{sublabel}</p>
      )}
    </div>
  );
}
