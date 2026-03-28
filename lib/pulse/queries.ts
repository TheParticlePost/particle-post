import { createClient } from "@/lib/supabase/server";
import type {
  AdoptionData,
  IndustryRoi,
  CaseStudy,
  RedFlag,
  TrendPoint,
  SnapshotRow,
  PulseDashboardData,
} from "./types";

// Fallback data for when Supabase is unavailable
import {
  ADOPTION_DATA,
  INDUSTRY_ROI,
  CASE_STUDIES,
  RED_FLAGS,
  TRENDS,
  SNAPSHOT,
} from "./seed-data";

export async function getPulseSnapshot(): Promise<SnapshotRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pulse_snapshot")
      .select("label, value, numeric_value, trend, display_order")
      .order("display_order");

    if (error || !data || data.length === 0) {
      return SNAPSHOT.map((s) => ({ ...s }));
    }
    return data as SnapshotRow[];
  } catch {
    return SNAPSHOT.map((s) => ({ ...s }));
  }
}

export async function getPulseDashboard(): Promise<PulseDashboardData> {
  try {
    const supabase = await createClient();

    const [
      snapshotRes,
      adoptionRes,
      adoptionTrendsRes,
      roiRes,
      caseStudiesRes,
      redFlagsRes,
      trendsRes,
    ] = await Promise.all([
      supabase.from("pulse_snapshot").select("*").order("display_order"),
      supabase.from("pulse_adoption_data").select("*").eq("year", 2024).order("adoption_rate", { ascending: false }),
      supabase.from("pulse_trends").select("*").eq("metric_name", "global_adoption_rate").order("date"),
      supabase.from("pulse_industry_roi").select("*").eq("year", 2024).order("roi_multiplier", { ascending: false }),
      supabase.from("pulse_case_studies").select("*").order("featured", { ascending: false }),
      supabase.from("pulse_red_flags").select("*").eq("active", true).order("date", { ascending: false }),
      supabase.from("pulse_trends").select("*").order("metric_name").order("date"),
    ]);

    // Use API data if available, otherwise fall back to seed data
    const snapshot = (snapshotRes.data?.length ? snapshotRes.data : SNAPSHOT.map((s) => ({ ...s }))) as SnapshotRow[];
    const adoptionByCountry = (adoptionRes.data?.length ? adoptionRes.data : ADOPTION_DATA.map((a) => ({ ...a }))) as AdoptionData[];
    const adoptionByYear = (adoptionTrendsRes.data?.length ? adoptionTrendsRes.data : TRENDS.filter((t) => t.metric_name === "global_adoption_rate").map((t) => ({ ...t }))) as TrendPoint[];
    const industryRoi = (roiRes.data?.length ? roiRes.data : INDUSTRY_ROI.map((r) => ({ ...r }))) as IndustryRoi[];
    const caseStudies = (caseStudiesRes.data?.length ? caseStudiesRes.data : CASE_STUDIES.map((c) => ({ ...c, id: c.company, slug: c.slug || null, image_url: null }))) as CaseStudy[];
    const redFlags = (redFlagsRes.data?.length ? redFlagsRes.data : RED_FLAGS.map((r) => ({ ...r, id: r.title, source_url: (r as any).source_url || null }))) as RedFlag[];
    const trends = (trendsRes.data?.length ? trendsRes.data : TRENDS.map((t) => ({ ...t }))) as TrendPoint[];

    return {
      snapshot,
      adoption: { byCountry: adoptionByCountry, byYear: adoptionByYear },
      industryRoi,
      caseStudies,
      redFlags,
      trends,
      meta: { lastUpdated: new Date().toISOString() },
    };
  } catch {
    // Full fallback to seed data
    return {
      snapshot: SNAPSHOT.map((s) => ({ ...s })),
      adoption: {
        byCountry: ADOPTION_DATA.map((a) => ({ ...a })),
        byYear: TRENDS.filter((t) => t.metric_name === "global_adoption_rate").map((t) => ({ ...t })),
      },
      industryRoi: INDUSTRY_ROI.map((r) => ({ ...r })),
      caseStudies: CASE_STUDIES.map((c) => ({ ...c, id: c.company, slug: c.slug || null, image_url: null })),
      redFlags: RED_FLAGS.map((r) => ({ ...r, id: r.title, source_url: (r as any).source_url || null })),
      trends: TRENDS.map((t) => ({ ...t })),
      meta: { lastUpdated: new Date().toISOString() },
    };
  }
}
