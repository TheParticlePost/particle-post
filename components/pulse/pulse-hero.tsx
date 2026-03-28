import { DataCallout } from "@/components/charts/data-callout";
import { FadeUp } from "@/components/effects/fade-up";
import { OverlineLabel } from "@/components/ui/overline-label";
import type { SnapshotRow } from "@/lib/pulse/types";

interface PulseHeroProps {
  snapshot: SnapshotRow[];
}

export function PulseHero({ snapshot }: PulseHeroProps) {
  const topMetrics = snapshot.slice(0, 4);

  return (
    <section className="bg-bg-base py-20 sm:py-24 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <FadeUp>
          <OverlineLabel className="mb-4 block">AI Intelligence Dashboard</OverlineLabel>
          <h1 className="font-display text-display-hero text-text-primary mb-4 max-w-3xl">
            AI Pulse
          </h1>
          <p className="text-body-lg text-text-secondary mb-12 max-w-2xl">
            Real-time intelligence on global AI adoption, industry ROI, and
            implementation signals — backed by data from McKinsey, Stanford HAI,
            and enterprise case studies.
          </p>
        </FadeUp>

        <FadeUp delay={0.05}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {topMetrics.map((metric, i) => (
              <DataCallout
                key={metric.label}
                value={metric.value}
                label={metric.label}
                accent={i === 0}
              />
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
