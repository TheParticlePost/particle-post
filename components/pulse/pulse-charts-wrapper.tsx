"use client";

import dynamic from "next/dynamic";
import type { AdoptionData, CaseStudy, TrendPoint, IndustryRoi } from "@/lib/pulse/types";

const PulseMap = dynamic(
  () => import("./pulse-map").then((m) => ({ default: m.PulseMap })),
  { ssr: false, loading: () => <div className="w-full h-[500px] bg-bg-container border border-border-ghost rounded-lg animate-pulse" /> }
);

const PulseAdoptionChart = dynamic(
  () => import("./pulse-adoption-chart").then((m) => ({ default: m.PulseAdoptionChart })),
  { ssr: false, loading: () => <div className="w-full h-[320px] bg-bg-container rounded-lg animate-pulse" /> }
);

const PulseRoiChart = dynamic(
  () => import("./pulse-roi-chart").then((m) => ({ default: m.PulseRoiChart })),
  { ssr: false, loading: () => <div className="w-full h-[500px] bg-bg-container rounded-lg animate-pulse" /> }
);

const PulseIndustryBreakdown = dynamic(
  () => import("./pulse-industry-breakdown").then((m) => ({ default: m.PulseIndustryBreakdown })),
  { ssr: false, loading: () => <div className="w-full h-[300px] bg-bg-container rounded-lg animate-pulse" /> }
);

export function PulseMapWrapper({ adoptionData, caseStudies }: { adoptionData: AdoptionData[]; caseStudies: CaseStudy[] }) {
  return <PulseMap adoptionData={adoptionData} caseStudies={caseStudies} />;
}

export function PulseAdoptionChartWrapper({ data }: { data: TrendPoint[] }) {
  return <PulseAdoptionChart data={data} />;
}

export function PulseRoiChartWrapper({ data }: { data: IndustryRoi[] }) {
  return <PulseRoiChart data={data} />;
}

export function PulseIndustryBreakdownWrapper({ data }: { data: IndustryRoi[] }) {
  return <PulseIndustryBreakdown data={data} />;
}
