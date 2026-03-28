export interface AdoptionData {
  country_code: string;
  country_name: string;
  year: number;
  adoption_rate: number;
  spend_billions: number | null;
  enterprise_pct: number | null;
}

export interface IndustryRoi {
  industry: string;
  roi_multiplier: number;
  median_payback_months: number;
  sample_size: number;
  year: number;
}

export interface CaseStudy {
  id: string;
  company: string;
  country_code: string;
  lat: number;
  lng: number;
  industry: string;
  headline: string;
  outcome_metric: string;
  outcome_value: number | null;
  slug: string | null;
  image_url: string | null;
  featured: boolean;
}

export interface RedFlag {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  source: string | null;
  source_url: string | null;
  date: string;
}

export interface TrendPoint {
  metric_name: string;
  date: string;
  value: number;
  unit: string;
}

export interface SnapshotRow {
  label: string;
  value: string;
  numeric_value: number | null;
  trend: "up" | "down" | "neutral";
  display_order: number;
}

export interface PulseDashboardData {
  snapshot: SnapshotRow[];
  adoption: {
    byCountry: AdoptionData[];
    byYear: TrendPoint[];
  };
  industryRoi: IndustryRoi[];
  caseStudies: CaseStudy[];
  redFlags: RedFlag[];
  trends: TrendPoint[];
  meta: {
    lastUpdated: string;
  };
}
