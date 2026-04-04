import { cn } from "@/lib/utils";

interface TagBadgeProps {
  label: string;
  color?: string;
  size?: "sm" | "md";
  className?: string;
}

export function TagBadge({
  label,
  color = "var(--text-secondary)",
  size = "sm",
  className,
}: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-lg border whitespace-nowrap",
        size === "sm" ? "px-2.5 py-0.5 text-caption" : "px-3 py-1 text-body-sm",
        className
      )}
      style={{
        color,
        borderColor: `${color}33`,
        backgroundColor: `${color}10`,
      }}
    >
      {label}
    </span>
  );
}
