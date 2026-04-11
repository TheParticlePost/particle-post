/**
 * Curated seed data for the Pulse dashboard. This is the FALLBACK data
 * surfaced when the Supabase pulse_* tables are empty or unreachable. The
 * canonical source of truth (once populated) is the database, refreshed
 * weekly by the pulse-refresh.yml workflow.
 *
 * If you're updating this manually, remember to also update the
 * `last_refreshed_at` timestamp shown on the dashboard via the Pulse hero —
 * stale numbers labelled as "current" hurt trust more than absence.
 *
 * Sources: McKinsey Global AI Survey 2026, Stanford HAI AI Index 2026,
 * OECD AI Policy Observatory, company earnings/press releases.
 *
 * Last manual refresh: 2026-04-10
 */

export const ADOPTION_DATA = [
  { country_code: "US", country_name: "United States", year: 2026, adoption_rate: 81, spend_billions: 88.4, enterprise_pct: 64 },
  { country_code: "CN", country_name: "China", year: 2026, adoption_rate: 69, spend_billions: 54.3, enterprise_pct: 58 },
  { country_code: "GB", country_name: "United Kingdom", year: 2026, adoption_rate: 57, spend_billions: 11.4, enterprise_pct: 49 },
  { country_code: "DE", country_name: "Germany", year: 2026, adoption_rate: 51, spend_billions: 9.6, enterprise_pct: 45 },
  { country_code: "IN", country_name: "India", year: 2026, adoption_rate: 67, spend_billions: 6.1, enterprise_pct: 60 },
  { country_code: "JP", country_name: "Japan", year: 2026, adoption_rate: 46, spend_billions: 12.3, enterprise_pct: 40 },
  { country_code: "CA", country_name: "Canada", year: 2026, adoption_rate: 60, spend_billions: 6.7, enterprise_pct: 52 },
  { country_code: "FR", country_name: "France", year: 2026, adoption_rate: 52, spend_billions: 7.4, enterprise_pct: 44 },
  { country_code: "AU", country_name: "Australia", year: 2026, adoption_rate: 54, spend_billions: 4.4, enterprise_pct: 47 },
  { country_code: "KR", country_name: "South Korea", year: 2026, adoption_rate: 59, spend_billions: 6.2, enterprise_pct: 52 },
  { country_code: "SG", country_name: "Singapore", year: 2026, adoption_rate: 70, spend_billions: 2.6, enterprise_pct: 64 },
  { country_code: "AE", country_name: "UAE", year: 2026, adoption_rate: 73, spend_billions: 3.0, enterprise_pct: 66 },
  { country_code: "IL", country_name: "Israel", year: 2026, adoption_rate: 65, spend_billions: 4.0, enterprise_pct: 58 },
  { country_code: "SE", country_name: "Sweden", year: 2026, adoption_rate: 55, spend_billions: 2.0, enterprise_pct: 48 },
  { country_code: "NL", country_name: "Netherlands", year: 2026, adoption_rate: 53, spend_billions: 2.7, enterprise_pct: 46 },
  { country_code: "BR", country_name: "Brazil", year: 2026, adoption_rate: 41, spend_billions: 3.3, enterprise_pct: 34 },
  { country_code: "SA", country_name: "Saudi Arabia", year: 2026, adoption_rate: 49, spend_billions: 2.4, enterprise_pct: 42 },
  { country_code: "ES", country_name: "Spain", year: 2026, adoption_rate: 43, spend_billions: 2.2, enterprise_pct: 36 },
  { country_code: "IT", country_name: "Italy", year: 2026, adoption_rate: 39, spend_billions: 2.6, enterprise_pct: 32 },
  { country_code: "MX", country_name: "Mexico", year: 2026, adoption_rate: 35, spend_billions: 1.4, enterprise_pct: 28 },
  { country_code: "ID", country_name: "Indonesia", year: 2026, adoption_rate: 31, spend_billions: 0.9, enterprise_pct: 24 },
  { country_code: "PL", country_name: "Poland", year: 2026, adoption_rate: 42, spend_billions: 1.0, enterprise_pct: 35 },
  { country_code: "CH", country_name: "Switzerland", year: 2026, adoption_rate: 58, spend_billions: 2.7, enterprise_pct: 50 },
  { country_code: "FI", country_name: "Finland", year: 2026, adoption_rate: 56, spend_billions: 1.1, enterprise_pct: 49 },
  { country_code: "NO", country_name: "Norway", year: 2026, adoption_rate: 51, spend_billions: 0.9, enterprise_pct: 44 },
  { country_code: "DK", country_name: "Denmark", year: 2026, adoption_rate: 53, spend_billions: 0.9, enterprise_pct: 46 },
  { country_code: "IE", country_name: "Ireland", year: 2026, adoption_rate: 56, spend_billions: 1.6, enterprise_pct: 48 },
  { country_code: "EE", country_name: "Estonia", year: 2026, adoption_rate: 60, spend_billions: 0.3, enterprise_pct: 53 },
  { country_code: "ZA", country_name: "South Africa", year: 2026, adoption_rate: 28, spend_billions: 0.6, enterprise_pct: 22 },
  { country_code: "NG", country_name: "Nigeria", year: 2026, adoption_rate: 24, spend_billions: 0.3, enterprise_pct: 17 },
] as const;

export const INDUSTRY_ROI = [
  { industry: "Financial Services", roi_multiplier: 4.6, median_payback_months: 10, sample_size: 380, year: 2026, source: "McKinsey" },
  { industry: "Healthcare", roi_multiplier: 4.0, median_payback_months: 13, sample_size: 310, year: 2026, source: "Accenture" },
  { industry: "Manufacturing", roi_multiplier: 3.8, median_payback_months: 12, sample_size: 340, year: 2026, source: "McKinsey" },
  { industry: "Retail & E-commerce", roi_multiplier: 4.2, median_payback_months: 8, sample_size: 460, year: 2026, source: "BCG" },
  { industry: "Technology", roi_multiplier: 4.9, median_payback_months: 7, sample_size: 600, year: 2026, source: "Stanford HAI" },
  { industry: "Energy & Utilities", roi_multiplier: 3.4, median_payback_months: 15, sample_size: 200, year: 2026, source: "Accenture" },
  { industry: "Telecom", roi_multiplier: 3.6, median_payback_months: 11, sample_size: 170, year: 2026, source: "McKinsey" },
  { industry: "Transportation", roi_multiplier: 3.1, median_payback_months: 17, sample_size: 140, year: 2026, source: "BCG" },
  { industry: "Professional Services", roi_multiplier: 3.9, median_payback_months: 9, sample_size: 290, year: 2026, source: "Deloitte" },
  { industry: "Government", roi_multiplier: 2.6, median_payback_months: 21, sample_size: 110, year: 2026, source: "OECD" },
  { industry: "Education", roi_multiplier: 2.8, median_payback_months: 19, sample_size: 130, year: 2026, source: "Stanford HAI" },
  { industry: "Agriculture", roi_multiplier: 3.2, median_payback_months: 14, sample_size: 100, year: 2026, source: "McKinsey" },
] as const;

export const CASE_STUDIES = [
  { company: "JPMorgan Chase", country_code: "US", lat: 40.7128, lng: -74.006, industry: "Financial Services", headline: "AI fraud detection saves $1.4B annually", outcome_metric: "$1.4B saved/yr", outcome_value: 1400, slug: "ai-fraud-detection-roi-arms-race", featured: true },
  { company: "Siemens", country_code: "DE", lat: 48.1351, lng: 11.582, industry: "Manufacturing", headline: "Predictive maintenance reduces downtime 42%", outcome_metric: "42% less downtime", outcome_value: 42, slug: null, featured: true },
  { company: "NHS England", country_code: "GB", lat: 51.5074, lng: -0.1278, industry: "Healthcare", headline: "AI triage cuts emergency wait times by 38%", outcome_metric: "38% faster triage", outcome_value: 38, slug: null, featured: false },
  { company: "Alibaba", country_code: "CN", lat: 30.2741, lng: 120.1551, industry: "Retail & E-commerce", headline: "Logistics AI reduces delivery time 31%", outcome_metric: "31% faster delivery", outcome_value: 31, slug: null, featured: false },
  { company: "Reliance Jio", country_code: "IN", lat: 19.076, lng: 72.8777, industry: "Telecom", headline: "Network optimization saves $410M in capex", outcome_metric: "$410M capex saved", outcome_value: 410, slug: null, featured: false },
  { company: "Toyota", country_code: "JP", lat: 35.0823, lng: 136.983, industry: "Manufacturing", headline: "Quality inspection AI detects 99.4% defects", outcome_metric: "99.4% detection", outcome_value: 99.4, slug: null, featured: true },
  { company: "Ramp", country_code: "US", lat: 40.7484, lng: -73.9857, industry: "Financial Services", headline: "AP automation cuts per-invoice cost from $15 to $2", outcome_metric: "$13 saved/invoice", outcome_value: 13, slug: "ai-accounts-payable-automation-implementation-guide", featured: false },
  { company: "DBS Bank", country_code: "SG", lat: 1.2804, lng: 103.8509, industry: "Financial Services", headline: "AI advisory handles 89% of customer queries", outcome_metric: "89% automation", outcome_value: 89, slug: null, featured: false },
  { company: "Aramco", country_code: "SA", lat: 26.3927, lng: 49.9777, industry: "Energy & Utilities", headline: "Digital twin AI cuts exploration costs 26%", outcome_metric: "26% cost reduction", outcome_value: 26, slug: null, featured: false },
  { company: "Shopify", country_code: "CA", lat: 45.4215, lng: -75.6972, industry: "Technology", headline: "AI product recommendations lift GMV 22%", outcome_metric: "22% GMV lift", outcome_value: 22, slug: null, featured: false },
] as const;

export const RED_FLAGS = [
  { title: "EU AI Act high-risk obligations now in force", severity: "high" as const, description: "Article 5 prohibitions and high-risk system obligations under the EU AI Act began enforcement in August 2025. Companies deploying high-risk AI systems in the EU face transparency, human-oversight and accuracy requirements with non-compliance penalties up to 7% of global revenue. Quebec Law 25 and similar regimes are following.", source: "European Commission", source_url: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai", date: "2026-03-15" },
  { title: "Deepfake fraud losses on track for $40B in 2026", severity: "critical" as const, description: "AI-generated deepfakes drove an estimated $32B in fraud losses through Q1 2026, on pace for $40B for the year — up from $25B in 2025. Voice-clone CFO scams now account for 19% of B2B wire fraud incidents.", source: "Deloitte Center for Financial Services", date: "2026-04-02" },
  { title: "Model collapse confirmed in production fine-tunes", severity: "medium" as const, description: "Multiple enterprise teams have reported quality degradation in models fine-tuned on synthetic-data-heavy pipelines. Audit data provenance and reserve at least 30% human-labeled samples in any RLHF or DPO loop.", source: "Nature / Anthropic", date: "2026-03-20" },
  { title: "Talent gap widens: 71% of AI projects understaffed", severity: "high" as const, description: "McKinsey's 2026 update finds the AI engineering talent gap has widened from 67% to 71% year-over-year. Average AI initiative now overruns budget by 2.5x. Reliance on contracted ML talent has doubled since 2024.", source: "McKinsey", date: "2026-03-28" },
  { title: "Open-source model licensing risk escalates", severity: "medium" as const, description: "Three major model families changed their commercial terms in Q1 2026 with retroactive effect. Legal teams report due-diligence time on model selection has tripled. Organizations should maintain a model bill-of-materials and re-audit quarterly.", source: "Stanford HAI", date: "2026-04-05" },
] as const;

export const TRENDS = [
  // Global AI adoption rate over time
  { metric_name: "global_adoption_rate", date: "2018-01-01", value: 20, unit: "percent" },
  { metric_name: "global_adoption_rate", date: "2019-01-01", value: 25, unit: "percent" },
  { metric_name: "global_adoption_rate", date: "2020-01-01", value: 32, unit: "percent" },
  { metric_name: "global_adoption_rate", date: "2021-01-01", value: 41, unit: "percent" },
  { metric_name: "global_adoption_rate", date: "2022-01-01", value: 50, unit: "percent" },
  { metric_name: "global_adoption_rate", date: "2023-01-01", value: 58, unit: "percent" },
  { metric_name: "global_adoption_rate", date: "2024-01-01", value: 72, unit: "percent" },
  { metric_name: "global_adoption_rate", date: "2025-01-01", value: 78, unit: "percent" },
  { metric_name: "global_adoption_rate", date: "2026-01-01", value: 83, unit: "percent" },
  // Enterprise AI spend
  { metric_name: "enterprise_ai_spend", date: "2018-01-01", value: 28, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2019-01-01", value: 38, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2020-01-01", value: 50, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2021-01-01", value: 68, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2022-01-01", value: 92, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2023-01-01", value: 125, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2024-01-01", value: 167, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2025-01-01", value: 210, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2026-01-01", value: 268, unit: "billions_usd" },
  // AI job postings growth (index, base 2018=100)
  { metric_name: "ai_job_postings_index", date: "2018-01-01", value: 100, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2019-01-01", value: 128, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2020-01-01", value: 142, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2021-01-01", value: 185, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2022-01-01", value: 240, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2023-01-01", value: 310, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2024-01-01", value: 420, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2025-01-01", value: 540, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2026-01-01", value: 660, unit: "index" },
] as const;

export const SNAPSHOT = [
  { label: "Enterprise AI Adoption", value: "83%", numeric_value: 83, trend: "up" as const, display_order: 1 },
  { label: "Global AI Market", value: "$268B+", numeric_value: 268, trend: "up" as const, display_order: 2 },
  { label: "Avg Implementation", value: "7 months", numeric_value: 7, trend: "down" as const, display_order: 3 },
  { label: "AI Job Postings", value: "+22% YoY", numeric_value: 22, trend: "up" as const, display_order: 4 },
  { label: "Open Source Share", value: "68%", numeric_value: 68, trend: "up" as const, display_order: 5 },
  { label: "Avg ROI Multiplier", value: "4.0x", numeric_value: 4.0, trend: "up" as const, display_order: 6 },
  { label: "EU AI Act Status", value: "In force", numeric_value: 0, trend: "neutral" as const, display_order: 7 },
  { label: "Talent Gap", value: "71%", numeric_value: 71, trend: "up" as const, display_order: 8 },
] as const;
