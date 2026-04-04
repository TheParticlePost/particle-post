"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/specialists/tag-badge";
import { AvailabilityBadge } from "@/components/specialists/availability-badge";
import { RatingDisplay } from "@/components/specialists/rating-display";
import { MatchScoreBar } from "@/components/specialists/match-score-bar";
import {
  getCategoryLabel,
  getCategoryColor,
  getCountryLabel,
} from "@/lib/specialists/constants";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchResult {
  id: string;
  match_score: number;
  category_score: number;
  geo_score: number;
  rating_score: number;
  availability_score: number;
  language_score: number;
  rank: number;
  specialist: {
    id: string;
    slug: string;
    display_name: string;
    headline: string;
    avatar_url: string | null;
    categories: string[];
    location_city: string;
    country_code: string;
    is_available: boolean;
    is_verified: boolean;
    avg_rating: number;
    total_reviews: number;
  };
}

interface Brief {
  id: string;
  client_name: string;
  project_description: string;
  categories: string[];
  match_count: number;
  status: string;
}

export default function MatchResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const [brief, setBrief] = useState<Brief | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/automatch/${id}`);
        if (!res.ok) throw new Error("Failed to load results");
        const data = await res.json();
        setBrief(data.brief);
        setMatches(data.matches);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-container mx-auto px-4 md:px-6 py-16 text-center">
        <p className="text-text-muted text-body-md">Finding your matches...</p>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="max-w-container mx-auto px-4 md:px-6 py-16 text-center">
        <p className="text-[#D14040] text-body-md">{error || "Results not found"}</p>
        <Link href="/specialists/match/">
          <Button variant="secondary" className="mt-4">Try Again</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-container mx-auto px-4 md:px-6 py-12">
      {/* Brief summary */}
      <div className="mb-10">
        <OverlineLabel>Match Results</OverlineLabel>
        <h1 className="font-display font-bold text-display-lg text-text-primary mt-3">
          {matches.length > 0
            ? `We found ${matches.length} specialist${matches.length !== 1 ? "s" : ""} for you`
            : "No matches found"}
        </h1>
        <p className="text-body-md text-text-secondary mt-2 max-w-[600px]">
          {brief.project_description.substring(0, 200)}
          {brief.project_description.length > 200 ? "..." : ""}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {brief.categories.map((cat) => (
            <TagBadge
              key={cat}
              label={getCategoryLabel(cat)}
              color={getCategoryColor(cat)}
            />
          ))}
        </div>
      </div>

      {/* Results */}
      {matches.length === 0 ? (
        <div className="bg-bg-container border border-border-ghost rounded-lg p-8 text-center">
          <p className="text-text-secondary text-body-md">
            No specialists matched your criteria. Try broadening your category selection.
          </p>
          <Link href="/specialists/match/">
            <Button variant="secondary" className="mt-4">Submit New Brief</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Link
              key={match.id}
              href={`/specialists/${match.specialist.slug}/`}
              className={cn(
                "group block bg-bg-container border border-border-ghost rounded-lg p-5",
                "hover:border-border-hover transition-colors duration-[180ms] ease-kinetic",
                match.rank <= 3 && "editorial-stripe"
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Rank */}
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-bg-high shrink-0">
                  <span className={cn(
                    "font-mono text-display-sm font-bold tabular-nums",
                    match.rank === 1 ? "text-accent" : "text-text-secondary"
                  )}>
                    {match.rank}
                  </span>
                </div>

                {/* Specialist info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-body-md text-text-primary group-hover:text-accent transition-colors">
                      {match.specialist.display_name}
                    </h3>
                    {match.specialist.is_verified && (
                      <DataText className="text-[#2D9B5A]">Verified</DataText>
                    )}
                  </div>
                  <p className="text-body-sm text-text-secondary line-clamp-1">
                    {match.specialist.headline}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <DataText className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {match.specialist.location_city}, {getCountryLabel(match.specialist.country_code)}
                    </DataText>
                    <AvailabilityBadge available={match.specialist.is_available} />
                    {match.specialist.total_reviews > 0 && (
                      <RatingDisplay
                        rating={match.specialist.avg_rating}
                        count={match.specialist.total_reviews}
                      />
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="w-full md:w-48 shrink-0">
                  <MatchScoreBar score={Math.round(match.match_score * 100)} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
