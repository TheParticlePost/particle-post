"use client";

import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/utils";

interface CategoryTabsProps {
  activeCategory: string;
  onSelect: (slug: string) => void;
}

export function CategoryTabs({ activeCategory, onSelect }: CategoryTabsProps) {
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1"
      role="tablist"
      aria-label="Filter articles by category"
    >
      <TabButton
        label="All"
        slug="all"
        isActive={activeCategory === "all"}
        onSelect={onSelect}
      />
      {CATEGORIES.map((cat) => (
        <TabButton
          key={cat.slug}
          label={cat.name}
          slug={cat.slug}
          color={cat.color}
          isActive={activeCategory === cat.slug}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function TabButton({
  label,
  slug,
  color,
  isActive,
  onSelect,
}: {
  label: string;
  slug: string;
  color?: string;
  isActive: boolean;
  onSelect: (slug: string) => void;
}) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => onSelect(slug)}
      className={cn(
        "whitespace-nowrap px-4 py-2 rounded-lg text-body-sm font-medium",
        "border transition-all duration-200",
        isActive
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-[var(--border)] text-foreground-secondary hover:text-foreground hover:border-[var(--border-hover)]"
      )}
      style={
        isActive && color
          ? {
              borderColor: `${color}66`,
              backgroundColor: `${color}15`,
              color,
            }
          : undefined
      }
    >
      {label}
    </button>
  );
}
