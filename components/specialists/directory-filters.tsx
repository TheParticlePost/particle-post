"use client";

import { cn } from "@/lib/utils";
import { FilterPill } from "@/components/ui/filter-pill";
import { SPECIALIST_CATEGORIES, COUNTRIES, LANGUAGES } from "@/lib/specialists/constants";
import { Search } from "lucide-react";

const inputStyles = cn(
  "w-full px-4 py-2.5 rounded-lg bg-bg-high/50 border border-border-ghost",
  "text-body-sm text-text-primary placeholder:text-text-muted",
  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  "transition-all duration-200"
);

const selectStyles = cn(
  "px-3 py-2 rounded-lg bg-bg-high/50 border border-border-ghost",
  "text-body-sm text-text-primary",
  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  "transition-all duration-200 appearance-none cursor-pointer"
);

interface DirectoryFiltersProps {
  category: string;
  country: string;
  language: string;
  availability: string;
  search: string;
  onCategoryChange: (category: string) => void;
  onCountryChange: (country: string) => void;
  onLanguageChange: (language: string) => void;
  onAvailabilityChange: (availability: string) => void;
  onSearchChange: (search: string) => void;
}

export function DirectoryFilters({
  category,
  country,
  language,
  availability,
  search,
  onCategoryChange,
  onCountryChange,
  onLanguageChange,
  onAvailabilityChange,
  onSearchChange,
}: DirectoryFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search specialists..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(inputStyles, "pl-10")}
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <FilterPill
          active={category === ""}
          onClick={() => onCategoryChange("")}
        >
          All
        </FilterPill>
        {SPECIALIST_CATEGORIES.map((cat) => (
          <FilterPill
            key={cat.slug}
            active={category === cat.slug}
            onClick={() => onCategoryChange(cat.slug)}
          >
            {cat.name}
          </FilterPill>
        ))}
      </div>

      {/* Dropdowns row */}
      <div className="flex flex-wrap gap-3">
        <select
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          className={selectStyles}
        >
          <option value="">All Countries</option>
          {COUNTRIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className={selectStyles}
        >
          <option value="">All Languages</option>
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        <select
          value={availability}
          onChange={(e) => onAvailabilityChange(e.target.value)}
          className={selectStyles}
        >
          <option value="">Any Availability</option>
          <option value="available">Available Now</option>
        </select>
      </div>
    </div>
  );
}
