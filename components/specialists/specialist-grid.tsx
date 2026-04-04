import { cn } from "@/lib/utils";
import { SpecialistCard } from "./specialist-card";
import type { SpecialistListItem } from "@/lib/specialists/types";

interface SpecialistGridProps {
  specialists: SpecialistListItem[];
  className?: string;
}

export function SpecialistGrid({ specialists, className }: SpecialistGridProps) {
  if (specialists.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-text-secondary text-body-md">
          No specialists found matching your criteria.
        </p>
        <p className="text-text-muted text-body-sm mt-2">
          Try adjusting your filters or{" "}
          <a href="/specialists/register/" className="text-accent hover:underline">
            list your practice
          </a>{" "}
          to be the first.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        className
      )}
    >
      {specialists.map((specialist) => (
        <SpecialistCard key={specialist.id} specialist={specialist} />
      ))}
    </div>
  );
}
