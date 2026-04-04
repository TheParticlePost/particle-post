"use client";

import { useState, useEffect, useCallback } from "react";
import { DirectoryFilters } from "./directory-filters";
import { SpecialistGrid } from "./specialist-grid";
import { Button } from "@/components/ui/button";
import type { SpecialistListItem } from "@/lib/specialists/types";

interface DirectoryContentProps {
  initialSpecialists: SpecialistListItem[];
  initialTotal: number;
}

const PAGE_SIZE = 12;

export function DirectoryContent({
  initialSpecialists,
  initialTotal,
}: DirectoryContentProps) {
  const [specialists, setSpecialists] = useState(initialSpecialists);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [availability, setAvailability] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSpecialists = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (country) params.set("country", country);
      if (language) params.set("language", language);
      if (availability) params.set("availability", availability);
      if (searchDebounced) params.set("q", searchDebounced);
      params.set("page", String(pageNum));
      params.set("limit", String(PAGE_SIZE));

      try {
        const res = await fetch(`/api/specialists?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setSpecialists((prev) =>
          append ? [...prev, ...data.specialists] : data.specialists
        );
        setTotal(data.total);
      } catch (err) {
        console.error("Failed to fetch specialists:", err);
      } finally {
        setLoading(false);
      }
    },
    [category, country, language, availability, searchDebounced]
  );

  // Re-fetch when filters change
  useEffect(() => {
    setPage(1);
    fetchSpecialists(1);
  }, [fetchSpecialists]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSpecialists(nextPage, true);
  };

  const hasMore = specialists.length < total;

  return (
    <div className="space-y-8">
      <DirectoryFilters
        category={category}
        country={country}
        language={language}
        availability={availability}
        search={search}
        onCategoryChange={setCategory}
        onCountryChange={setCountry}
        onLanguageChange={setLanguage}
        onAvailabilityChange={setAvailability}
        onSearchChange={setSearch}
      />

      <div className="flex items-center justify-between">
        <p className="text-body-sm text-text-muted font-mono tabular-nums">
          {total} specialist{total !== 1 ? "s" : ""} found
        </p>
      </div>

      <SpecialistGrid specialists={specialists} />

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="ghost"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
