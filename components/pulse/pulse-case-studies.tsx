import Link from "next/link";
import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
import { cn } from "@/lib/utils";
import type { CaseStudy } from "@/lib/pulse/types";

interface PulseCaseStudiesProps {
  caseStudies: CaseStudy[];
}

export function PulseCaseStudies({ caseStudies }: PulseCaseStudiesProps) {
  // Prioritize published case studies (those with a slug linking to an article)
  const published = caseStudies.filter((cs) => cs.slug);
  const seedOnly = caseStudies.filter((cs) => !cs.slug && cs.featured);
  // Show all published first, then fill with featured seed data up to 9
  const all = [...published, ...seedOnly].slice(0, 9);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {all.map((cs) => {
        const Card = (
          <div
            className={cn(
              "bg-bg-container border border-border-ghost rounded-lg p-6",
              "hover:border-accent transition-colors duration-[180ms] ease-kinetic",
              cs.featured && "editorial-stripe"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <OverlineLabel>{cs.industry}</OverlineLabel>
              <DataText className="text-caption">{cs.country_code}</DataText>
            </div>
            <h4 className="font-display text-display-sm text-text-primary mb-2">
              {cs.company}
            </h4>
            <p className="text-body-sm text-text-secondary mb-4">
              {cs.headline}
            </p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-data text-accent font-medium">
                {cs.outcome_metric}
              </span>
              {cs.slug && (
                <span className="font-mono text-caption text-accent">
                  Read case study &rarr;
                </span>
              )}
            </div>
          </div>
        );

        return cs.slug ? (
          <Link key={cs.id || cs.company} href={`/posts/${cs.slug}/`} aria-label={cs.company} className="block">
            {Card}
          </Link>
        ) : (
          <div key={cs.id || cs.company}>{Card}</div>
        );
      })}
    </div>
  );
}
