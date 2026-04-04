import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
import { AvailabilityBadge } from "./availability-badge";
import { RatingDisplay } from "./rating-display";
import { TagBadge } from "./tag-badge";
import { PortfolioCard } from "./portfolio-card";
import { ContactForm } from "./contact-form";
import {
  getCategoryLabel,
  getCategoryColor,
  getCountryLabel,
  getLanguageLabel,
} from "@/lib/specialists/constants";
import type { Specialist, PortfolioItem, SpecialistReview } from "@/lib/specialists/types";
import { MapPin, ExternalLink, Linkedin, Calendar } from "lucide-react";
import { formatDateShort } from "@/lib/utils";

interface SpecialistProfileViewProps {
  specialist: Specialist;
  portfolio: PortfolioItem[];
  reviews: SpecialistReview[];
}

export function SpecialistProfileView({
  specialist,
  portfolio,
  reviews,
}: SpecialistProfileViewProps) {
  return (
    <div className="max-w-container mx-auto px-4 md:px-6 py-12">
      {/* Hero */}
      <section className="flex flex-col md:flex-row items-start gap-6 pb-8 border-b border-border-ghost">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-lg bg-bg-high flex items-center justify-center shrink-0 overflow-hidden">
          {specialist.avatar_url ? (
            <img
              src={specialist.avatar_url}
              alt={specialist.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-display font-bold text-display-md text-text-muted">
              {specialist.display_name.charAt(0)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {specialist.categories[0] && (
              <OverlineLabel>
                {getCategoryLabel(specialist.categories[0])}
              </OverlineLabel>
            )}
            {specialist.is_verified && (
              <DataText className="text-[#2D9B5A]">Verified</DataText>
            )}
          </div>

          <h1 className="font-display font-bold text-display-lg text-text-primary">
            {specialist.display_name}
          </h1>
          <p className="text-body-lg text-text-secondary mt-1">
            {specialist.headline}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <DataText className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {specialist.location_city}, {getCountryLabel(specialist.country_code)}
            </DataText>
            <AvailabilityBadge available={specialist.is_available} />
            {specialist.total_reviews > 0 && (
              <RatingDisplay
                rating={specialist.avg_rating}
                count={specialist.total_reviews}
              />
            )}
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 mt-3">
            <a
              href={specialist.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-body-sm text-text-secondary hover:text-accent transition-colors"
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </a>
            {specialist.website_url && (
              <a
                href={specialist.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-body-sm text-text-secondary hover:text-accent transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Website
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-10">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-10">
          {/* About */}
          {specialist.bio && (
            <section>
              <OverlineLabel className="mb-4 block">About</OverlineLabel>
              <p className="text-body-md text-text-body leading-relaxed whitespace-pre-line">
                {specialist.bio}
              </p>
            </section>
          )}

          {/* Categories & skills */}
          <section>
            <OverlineLabel className="mb-4 block">Expertise</OverlineLabel>
            <div className="flex flex-wrap gap-2">
              {specialist.categories.map((cat) => (
                <TagBadge
                  key={cat}
                  label={getCategoryLabel(cat)}
                  color={getCategoryColor(cat)}
                  size="md"
                />
              ))}
            </div>
            {specialist.industries.length > 0 && (
              <div className="mt-4">
                <p className="text-body-sm text-text-muted mb-2">Industries</p>
                <div className="flex flex-wrap gap-2">
                  {specialist.industries.map((ind) => (
                    <TagBadge key={ind} label={ind} size="sm" />
                  ))}
                </div>
              </div>
            )}
            {specialist.certifications.length > 0 && (
              <div className="mt-4">
                <p className="text-body-sm text-text-muted mb-2">Certifications</p>
                <div className="flex flex-wrap gap-2">
                  {specialist.certifications.map((cert) => (
                    <TagBadge key={cert} label={cert} size="sm" />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <section>
              <OverlineLabel className="mb-4 block">Portfolio</OverlineLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portfolio.map((item) => (
                  <PortfolioCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <section>
              <OverlineLabel className="mb-4 block">Reviews</OverlineLabel>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-bg-container border border-border-ghost rounded-lg p-5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <RatingDisplay rating={review.rating} />
                      <DataText>
                        <Calendar className="w-3.5 h-3.5 inline mr-1" />
                        {formatDateShort(review.created_at)}
                      </DataText>
                    </div>
                    {review.title && (
                      <h4 className="font-display font-bold text-body-md text-text-primary">
                        {review.title}
                      </h4>
                    )}
                    {review.body && (
                      <p className="text-body-sm text-text-secondary">
                        {review.body}
                      </p>
                    )}
                    <p className="text-body-sm text-text-muted">
                      {review.reviewer_name}
                      {review.reviewer_company && ` at ${review.reviewer_company}`}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick info card */}
          <div className="bg-bg-container border border-border-ghost rounded-lg p-5 space-y-4">
            <h3 className="font-display font-bold text-body-md text-text-primary">
              Quick Info
            </h3>
            <div className="space-y-3">
              {specialist.hourly_rate_range && (
                <div>
                  <p className="text-caption text-text-muted uppercase tracking-wide">Rate</p>
                  <DataText className="text-text-primary">
                    {specialist.hourly_rate_range === "project"
                      ? "Project-based"
                      : `$${specialist.hourly_rate_range}/hr`}
                  </DataText>
                </div>
              )}
              <div>
                <p className="text-caption text-text-muted uppercase tracking-wide">Type</p>
                <DataText className="text-text-primary capitalize">
                  {specialist.type}
                </DataText>
              </div>
              {specialist.team_size && (
                <div>
                  <p className="text-caption text-text-muted uppercase tracking-wide">
                    Team Size
                  </p>
                  <DataText className="text-text-primary">
                    {specialist.team_size}
                  </DataText>
                </div>
              )}
              <div>
                <p className="text-caption text-text-muted uppercase tracking-wide">
                  Languages
                </p>
                <DataText className="text-text-primary">
                  {specialist.languages.map(getLanguageLabel).join(", ")}
                </DataText>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="bg-bg-low border border-border-ghost rounded-lg p-5">
            <h3 className="font-display font-bold text-body-md text-text-primary mb-4">
              Get in Touch
            </h3>
            <ContactForm
              specialistSlug={specialist.slug}
              specialistName={specialist.display_name}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
