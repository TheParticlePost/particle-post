import type { Metadata } from "next";
import { getPulseDashboard } from "@/lib/pulse/queries";
import { PulseHero } from "@/components/pulse/pulse-hero";
import { PulseSection } from "@/components/pulse/pulse-section";
import { PulseMapMobile } from "@/components/pulse/pulse-map-mobile";
import { PulseRedFlags } from "@/components/pulse/pulse-red-flags";
import { PulseCaseStudies } from "@/components/pulse/pulse-case-studies";
import {
  PulseMapWrapper,
  PulseAdoptionChartWrapper,
  PulseRoiChartWrapper,
  PulseIndustryBreakdownWrapper,
} from "@/components/pulse/pulse-charts-wrapper";

export const metadata: Metadata = {
  title: "AI Pulse | Intelligence Dashboard",
  description:
    "Snapshot intelligence on global AI adoption, industry ROI, and implementation signals. Powered by data from McKinsey, Stanford HAI, and enterprise case studies. Refreshed weekly.",
};

export const revalidate = 3600;

export default async function PulsePage() {
  const data = await getPulseDashboard();

  return (
    <div>
      {/* 1. Hero — KPI Callouts */}
      <PulseHero
        snapshot={data.snapshot}
        lastUpdated={data.meta.lastUpdated}
      />

      {/* 2. Global Map — Adoption heatmap + case study dots */}
      <PulseSection overline="Global Coverage" title="AI Adoption by Country" bg="low" delay={0.05}>
        <div className="hidden md:block">
          <PulseMapWrapper
            adoptionData={data.adoption.byCountry}
            caseStudies={data.caseStudies}
          />
        </div>
        <div className="md:hidden">
          <PulseMapMobile adoptionData={data.adoption.byCountry} />
        </div>
      </PulseSection>

      {/* 3. Adoption Over Time — Area chart */}
      <PulseSection overline="Trend" title="Enterprise AI Adoption Over Time" bg="base" delay={0.1}>
        <PulseAdoptionChartWrapper data={data.adoption.byYear} />
      </PulseSection>

      {/* 4. ROI by Industry — Horizontal bar chart */}
      <PulseSection overline="Returns" title="ROI by Industry" bg="low" delay={0.15}>
        <PulseRoiChartWrapper data={data.industryRoi} />
      </PulseSection>

      {/* 5. Red Flags — Risk indicator cards */}
      <PulseSection overline="Risk Signals" title="Red Flags" bg="base" delay={0.2}>
        <PulseRedFlags flags={data.redFlags} />
      </PulseSection>

      {/* 6. Case Studies — Card grid */}
      <PulseSection overline="Evidence" title="Case Studies" bg="low" delay={0.25}>
        <PulseCaseStudies caseStudies={data.caseStudies} />
      </PulseSection>

      {/* 7. Industry Breakdown — Donut chart */}
      <PulseSection overline="Distribution" title="AI Investment by Industry" bg="base" delay={0.3}>
        <PulseIndustryBreakdownWrapper data={data.industryRoi} />
      </PulseSection>
    </div>
  );
}
