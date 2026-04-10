/**
 * Cover generation types.
 * Schema mirrors the design brief exactly so CLI configs are author-friendly.
 */

export type CoverMode =
  | "big-stat"
  | "headline-hook"
  | "comparison"
  | "framework"
  | "background-image";

export type CategoryLabel =
  | "INDUSTRY BRIEFING"
  | "DEEP DIVE"
  | "CASE STUDY"
  | "HOW-TO"
  | "TECHNOLOGY PROFILE"
  | "NEWS ANALYSIS"
  | "AI STRATEGY"
  | "BANKING & LENDING"
  | "AI & REGULATION"
  | "TECHNOLOGY DEEP DIVE";

export type OutputFormat = "og-linkedin";

export interface ComparisonSide {
  name: string;
  metric: string;
  detail: string;
}

export interface CoverConfig {
  title: string;
  slug: string;
  category: CategoryLabel | string;
  date: string; // ISO "2026-04-08" or pre-formatted "Apr 8, 2026"
  coverMode: CoverMode;

  // Mode A
  hookStat?: string | null;
  hookContext?: string | null;

  // Mode B
  hookText?: string | null;

  // Mode C
  comparisonLeft?: ComparisonSide | null;
  comparisonRight?: ComparisonSide | null;

  // Mode D
  frameworkName?: string | null;
  frameworkSteps?: string[] | null;

  // Mode E
  backgroundImage?: string | null; // local path or URL
  geminiPrompt?: string | null;

  formats?: OutputFormat[];
}

export interface DimensionSpec {
  width: number;
  height: number;
}

export const FORMAT_DIMENSIONS: Record<OutputFormat, DimensionSpec> = {
  "og-linkedin": { width: 1200, height: 628 },
};
