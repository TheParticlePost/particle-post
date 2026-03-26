import { cn } from "@/lib/utils";

interface Category {
  name: string;
  count: number;
}

interface CategoryBreakdownProps {
  categories: Category[];
}

// Use the project's accent palette for category colors
const BAR_COLORS = [
  "#00d4aa", // accent teal
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  if (categories.length === 0) {
    return (
      <p className="text-body-sm text-foreground-muted py-4">
        No categories found.
      </p>
    );
  }

  const maxCount = Math.max(...categories.map((c) => c.count), 1);

  return (
    <div className="space-y-3">
      {categories.map((category, i) => {
        const widthPercent = (category.count / maxCount) * 100;
        const color = BAR_COLORS[i % BAR_COLORS.length];

        return (
          <div key={category.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-foreground">{category.name}</span>
              <span className="text-body-xs text-foreground-muted font-medium">
                {category.count}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500"
                )}
                style={{
                  width: `${Math.max(widthPercent, 3)}%`,
                  backgroundColor: color,
                  opacity: 0.8,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
