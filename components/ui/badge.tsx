import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/utils";

interface BadgeProps {
  category: string;
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ category, size = "sm", className }: BadgeProps) {
  const categoryData = CATEGORIES.find(
    (c) => c.name.toLowerCase() === category.toLowerCase() || c.slug === category
  );

  const color = categoryData?.color ?? "var(--text-secondary)";
  const label = categoryData?.name ?? category;

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
