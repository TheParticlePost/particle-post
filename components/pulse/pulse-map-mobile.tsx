import { TrendSparkline } from "@/components/charts/trend-sparkline";
import { DataText } from "@/components/ui/data-text";
import { cn } from "@/lib/utils";
import type { AdoptionData } from "@/lib/pulse/types";

interface PulseMapMobileProps {
  adoptionData: AdoptionData[];
}

export function PulseMapMobile({ adoptionData }: PulseMapMobileProps) {
  const sorted = [...adoptionData].sort((a, b) => b.adoption_rate - a.adoption_rate);

  return (
    <div className="bg-bg-container border border-border-ghost rounded-lg overflow-hidden">
      {sorted.slice(0, 15).map((country, i) => (
        <div
          key={country.country_code}
          className={cn(
            "flex items-center justify-between px-4 py-3",
            i !== Math.min(sorted.length, 15) - 1 && "border-b border-border-ghost"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-caption text-text-muted w-5 text-right">
              {i + 1}
            </span>
            <span className="text-body-sm text-text-primary">
              {country.country_name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <TrendSparkline
              data={[
                country.adoption_rate * 0.6,
                country.adoption_rate * 0.75,
                country.adoption_rate * 0.85,
                country.adoption_rate,
              ]}
              width={48}
              height={16}
            />
            <DataText className="font-medium text-text-primary min-w-[40px] text-right">
              {country.adoption_rate}%
            </DataText>
          </div>
        </div>
      ))}
    </div>
  );
}
