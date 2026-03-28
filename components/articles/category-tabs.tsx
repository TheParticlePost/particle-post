"use client";

import { CATEGORIES } from "@/lib/utils";
import { FilterPill } from "@/components/ui/filter-pill";

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
      <FilterPill
        active={activeCategory === "all"}
        onClick={() => onSelect("all")}
      >
        All
      </FilterPill>
      {CATEGORIES.map((cat) => (
        <FilterPill
          key={cat.slug}
          active={activeCategory === cat.slug}
          onClick={() => onSelect(cat.slug)}
        >
          {cat.name}
        </FilterPill>
      ))}
    </div>
  );
}
