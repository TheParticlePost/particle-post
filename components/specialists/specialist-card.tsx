import Link from "next/link";
import { cn } from "@/lib/utils";
import { DataText } from "@/components/ui/data-text";
import { AvailabilityBadge } from "./availability-badge";
import { RatingDisplay } from "./rating-display";
import { TagBadge } from "./tag-badge";
import { getCategoryLabel, getCategoryColor, getCountryLabel } from "@/lib/specialists/constants";
import type { SpecialistListItem } from "@/lib/specialists/types";
import { MapPin } from "lucide-react";

interface SpecialistCardProps {
  specialist: SpecialistListItem;
  className?: string;
}

export function SpecialistCard({ specialist, className }: SpecialistCardProps) {
  const primaryCategory = specialist.categories[0];

  return (
    <Link
      href={`/specialists/${specialist.slug}/`}
      aria-label={specialist.display_name}
      className={cn(
        "group block bg-bg-container border border-border-ghost rounded-lg overflow-hidden",
        "hover:border-border-hover transition-colors duration-[180ms] ease-kinetic",
        specialist.is_featured && "editorial-stripe",
        className
      )}
    >
      <div className="p-5 space-y-3">
        {/* Header: avatar + name + headline */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-lg bg-bg-high flex items-center justify-center shrink-0 overflow-hidden">
            {specialist.avatar_url ? (
              <img
                src={specialist.avatar_url}
                alt={specialist.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display font-bold text-body-md text-text-muted">
                {specialist.display_name.charAt(0)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "font-display font-bold text-body-md text-text-primary leading-snug",
                "group-hover:text-accent transition-colors duration-[180ms] ease-kinetic"
              )}
            >
              <span className="line-clamp-1">{specialist.display_name}</span>
            </h3>
            <p className="text-body-sm text-text-secondary line-clamp-1 mt-0.5">
              {specialist.headline}
            </p>
          </div>
        </div>

        {/* Category badge */}
        {primaryCategory && (
          <TagBadge
            label={getCategoryLabel(primaryCategory)}
            color={getCategoryColor(primaryCategory)}
          />
        )}

        {/* Location + availability */}
        <div className="flex items-center justify-between gap-2">
          <DataText className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {specialist.location_city}, {getCountryLabel(specialist.country_code)}
          </DataText>
          <AvailabilityBadge available={specialist.is_available} />
        </div>

        {/* Rating + verified */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-ghost">
          <RatingDisplay
            rating={specialist.avg_rating}
            count={specialist.total_reviews}
          />
          {specialist.is_verified && (
            <DataText className="text-[#2D9B5A]">Verified</DataText>
          )}
        </div>
      </div>
    </Link>
  );
}
