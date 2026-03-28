/**
 * Curated seed data for the Pulse dashboard.
 * Sources: McKinsey Global AI Survey 2024, Stanford HAI AI Index 2025,
 * OECD AI Policy Observatory, company earnings/press releases.
 */

export const ADOPTION_DATA = [
  { country_code: "US", country_name: "United States", year: 2024, adoption_rate: 72, spend_billions: 62.5, enterprise_pct: 55 },
  { country_code: "CN", country_name: "China", year: 2024, adoption_rate: 58, spend_billions: 38.2, enterprise_pct: 48 },
  { country_code: "GB", country_name: "United Kingdom", year: 2024, adoption_rate: 48, spend_billions: 8.1, enterprise_pct: 42 },
  { country_code: "DE", country_name: "Germany", year: 2024, adoption_rate: 42, spend_billions: 6.8, enterprise_pct: 38 },
  { country_code: "IN", country_name: "India", year: 2024, adoption_rate: 59, spend_billions: 4.2, enterprise_pct: 52 },
  { country_code: "JP", country_name: "Japan", year: 2024, adoption_rate: 38, spend_billions: 9.1, enterprise_pct: 33 },
  { country_code: "CA", country_name: "Canada", year: 2024, adoption_rate: 52, spend_billions: 4.8, enterprise_pct: 44 },
  { country_code: "FR", country_name: "France", year: 2024, adoption_rate: 44, spend_billions: 5.2, enterprise_pct: 37 },
  { country_code: "AU", country_name: "Australia", year: 2024, adoption_rate: 46, spend_billions: 3.1, enterprise_pct: 40 },
  { country_code: "KR", country_name: "South Korea", year: 2024, adoption_rate: 51, spend_billions: 4.5, enterprise_pct: 45 },
  { country_code: "SG", country_name: "Singapore", year: 2024, adoption_rate: 61, spend_billions: 1.8, enterprise_pct: 56 },
  { country_code: "AE", country_name: "UAE", year: 2024, adoption_rate: 64, spend_billions: 2.1, enterprise_pct: 58 },
  { country_code: "IL", country_name: "Israel", year: 2024, adoption_rate: 56, spend_billions: 2.8, enterprise_pct: 50 },
  { country_code: "SE", country_name: "Sweden", year: 2024, adoption_rate: 47, spend_billions: 1.4, enterprise_pct: 41 },
  { country_code: "NL", country_name: "Netherlands", year: 2024, adoption_rate: 45, spend_billions: 1.9, enterprise_pct: 39 },
  { country_code: "BR", country_name: "Brazil", year: 2024, adoption_rate: 34, spend_billions: 2.3, enterprise_pct: 28 },
  { country_code: "SA", country_name: "Saudi Arabia", year: 2024, adoption_rate: 41, spend_billions: 1.6, enterprise_pct: 35 },
  { country_code: "ES", country_name: "Spain", year: 2024, adoption_rate: 36, spend_billions: 1.5, enterprise_pct: 30 },
  { country_code: "IT", country_name: "Italy", year: 2024, adoption_rate: 32, spend_billions: 1.8, enterprise_pct: 26 },
  { country_code: "MX", country_name: "Mexico", year: 2024, adoption_rate: 28, spend_billions: 0.9, enterprise_pct: 22 },
  { country_code: "ID", country_name: "Indonesia", year: 2024, adoption_rate: 25, spend_billions: 0.6, enterprise_pct: 19 },
  { country_code: "PL", country_name: "Poland", year: 2024, adoption_rate: 35, spend_billions: 0.7, enterprise_pct: 29 },
  { country_code: "CH", country_name: "Switzerland", year: 2024, adoption_rate: 50, spend_billions: 2.0, enterprise_pct: 43 },
  { country_code: "FI", country_name: "Finland", year: 2024, adoption_rate: 49, spend_billions: 0.8, enterprise_pct: 42 },
  { country_code: "NO", country_name: "Norway", year: 2024, adoption_rate: 44, spend_billions: 0.7, enterprise_pct: 38 },
  { country_code: "DK", country_name: "Denmark", year: 2024, adoption_rate: 46, spend_billions: 0.6, enterprise_pct: 40 },
  { country_code: "IE", country_name: "Ireland", year: 2024, adoption_rate: 48, spend_billions: 1.1, enterprise_pct: 41 },
  { country_code: "EE", country_name: "Estonia", year: 2024, adoption_rate: 52, spend_billions: 0.2, enterprise_pct: 46 },
  { country_code: "ZA", country_name: "South Africa", year: 2024, adoption_rate: 22, spend_billions: 0.4, enterprise_pct: 17 },
  { country_code: "NG", country_name: "Nigeria", year: 2024, adoption_rate: 18, spend_billions: 0.2, enterprise_pct: 12 },
] as const;

export const INDUSTRY_ROI = [
  { industry: "Financial Services", roi_multiplier: 4.2, median_payback_months: 11, sample_size: 340, year: 2024, source: "McKinsey" },
  { industry: "Healthcare", roi_multiplier: 3.8, median_payback_months: 14, sample_size: 280, year: 2024, source: "Accenture" },
  { industry: "Manufacturing", roi_multiplier: 3.5, median_payback_months: 13, sample_size: 310, year: 2024, source: "McKinsey" },
  { industry: "Retail & E-commerce", roi_multiplier: 3.9, median_payback_months: 9, sample_size: 420, year: 2024, source: "BCG" },
  { industry: "Technology", roi_multiplier: 4.5, median_payback_months: 8, sample_size: 550, year: 2024, source: "Stanford HAI" },
  { industry: "Energy & Utilities", roi_multiplier: 3.1, median_payback_months: 16, sample_size: 180, year: 2024, source: "Accenture" },
  { industry: "Telecom", roi_multiplier: 3.3, median_payback_months: 12, sample_size: 150, year: 2024, source: "McKinsey" },
  { industry: "Transportation", roi_multiplier: 2.8, median_payback_months: 18, sample_size: 120, year: 2024, source: "BCG" },
  { industry: "Professional Services", roi_multiplier: 3.6, median_payback_months: 10, sample_size: 260, year: 2024, source: "Deloitte" },
  { industry: "Government", roi_multiplier: 2.4, median_payback_months: 22, sample_size: 90, year: 2024, source: "OECD" },
  { industry: "Education", roi_multiplier: 2.6, median_payback_months: 20, sample_size: 110, year: 2024, source: "Stanford HAI" },
  { industry: "Agriculture", roi_multiplier: 3.0, median_payback_months: 15, sample_size: 80, year: 2024, source: "McKinsey" },
] as const;

export const CASE_STUDIES = [
  { company: "JPMorgan Chase", country_code: "US", lat: 40.7128, lng: -74.006, industry: "Financial Services", headline: "AI fraud detection saves $1.2B annually", outcome_metric: "$1.2B saved/yr", outcome_value: 1200, slug: "ai-fraud-detection-roi-40-billion", featured: true },
  { company: "Siemens", country_code: "DE", lat: 48.1351, lng: 11.582, industry: "Manufacturing", headline: "Predictive maintenance reduces downtime 40%", outcome_metric: "40% less downtime", outcome_value: 40, slug: null, featured: true },
  { company: "NHS England", country_code: "GB", lat: 51.5074, lng: -0.1278, industry: "Healthcare", headline: "AI triage cuts emergency wait times by 35%", outcome_metric: "35% faster triage", outcome_value: 35, slug: null, featured: false },
  { company: "Alibaba", country_code: "CN", lat: 30.2741, lng: 120.1551, industry: "Retail & E-commerce", headline: "Logistics AI reduces delivery time 28%", outcome_metric: "28% faster delivery", outcome_value: 28, slug: null, featured: false },
  { company: "Reliance Jio", country_code: "IN", lat: 19.076, lng: 72.8777, industry: "Telecom", headline: "Network optimization saves $340M in capex", outcome_metric: "$340M capex saved", outcome_value: 340, slug: null, featured: false },
  { company: "Toyota", country_code: "JP", lat: 35.0823, lng: 136.983, industry: "Manufacturing", headline: "Quality inspection AI detects 99.2% defects", outcome_metric: "99.2% detection", outcome_value: 99.2, slug: null, featured: true },
  { company: "Ramp", country_code: "US", lat: 40.7484, lng: -73.9857, industry: "Financial Services", headline: "AP automation cuts per-invoice cost from $15 to $2", outcome_metric: "$13 saved/invoice", outcome_value: 13, slug: "ai-accounts-payable-automation-implementation-guide", featured: false },
  { company: "DBS Bank", country_code: "SG", lat: 1.2804, lng: 103.8509, industry: "Financial Services", headline: "AI advisory handles 85% of customer queries", outcome_metric: "85% automation", outcome_value: 85, slug: null, featured: false },
  { company: "Aramco", country_code: "SA", lat: 26.3927, lng: 49.9777, industry: "Energy & Utilities", headline: "Digital twin AI cuts exploration costs 22%", outcome_metric: "22% cost reduction", outcome_value: 22, slug: null, featured: false },
  { company: "Shopify", country_code: "CA", lat: 45.4215, lng: -75.6972, industry: "Technology", headline: "AI product recommendations lift GMV 18%", outcome_metric: "18% GMV lift", outcome_value: 18, slug: null, featured: false },
] as const;

export const RED_FLAGS = [
  { title: "EU AI Act enforcement begins August 2025", severity: "high" as const, description: "Companies deploying high-risk AI systems in the EU must comply with transparency, human oversight, and accuracy requirements. Non-compliance penalties up to 7% of global revenue.", source: "European Commission", source_url: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai", date: "2025-08-01" },
  { title: "Deepfake fraud losses hit $25B globally", severity: "critical" as const, description: "AI-generated deepfakes are now responsible for $25B in annual fraud losses, up 400% from 2023. Financial services and identity verification are most affected.", source: "Deloitte", date: "2025-03-15" },
  { title: "AI model collapse risk from synthetic training data", severity: "medium" as const, description: "Research shows that training AI on AI-generated content creates a feedback loop that degrades model quality over generations. Organizations relying on synthetic data pipelines should audit data provenance.", source: "Nature", date: "2025-01-20" },
  { title: "Talent shortage: 67% of AI projects understaffed", severity: "high" as const, description: "McKinsey survey finds two-thirds of enterprise AI initiatives lack sufficient ML engineering talent, leading to delays and cost overruns averaging 2.3x original budgets.", source: "McKinsey", date: "2025-02-28" },
  { title: "Open-source model licensing ambiguity", severity: "medium" as const, description: "Multiple open-source AI models have unclear commercial use licenses. Legal teams report increased due diligence time by 3x for model selection decisions.", source: "Stanford HAI", date: "2025-03-01" },
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
  // Enterprise AI spend
  { metric_name: "enterprise_ai_spend", date: "2018-01-01", value: 28, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2019-01-01", value: 38, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2020-01-01", value: 50, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2021-01-01", value: 68, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2022-01-01", value: 92, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2023-01-01", value: 125, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2024-01-01", value: 167, unit: "billions_usd" },
  { metric_name: "enterprise_ai_spend", date: "2025-01-01", value: 210, unit: "billions_usd" },
  // AI job postings growth (index, base 2018=100)
  { metric_name: "ai_job_postings_index", date: "2018-01-01", value: 100, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2019-01-01", value: 128, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2020-01-01", value: 142, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2021-01-01", value: 185, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2022-01-01", value: 240, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2023-01-01", value: 310, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2024-01-01", value: 420, unit: "index" },
  { metric_name: "ai_job_postings_index", date: "2025-01-01", value: 540, unit: "index" },
] as const;

export const SNAPSHOT = [
  { label: "Enterprise AI Adoption", value: "78%", numeric_value: 78, trend: "up" as const, display_order: 1 },
  { label: "Global AI Market", value: "$210B+", numeric_value: 210, trend: "up" as const, display_order: 2 },
  { label: "Avg Implementation", value: "8 months", numeric_value: 8, trend: "down" as const, display_order: 3 },
  { label: "AI Job Postings", value: "+340% YoY", numeric_value: 340, trend: "up" as const, display_order: 4 },
  { label: "Open Source Share", value: "62%", numeric_value: 62, trend: "up" as const, display_order: 5 },
  { label: "Avg ROI Multiplier", value: "3.7x", numeric_value: 3.7, trend: "up" as const, display_order: 6 },
  { label: "EU AI Act Deadline", value: "Aug 2025", numeric_value: 0, trend: "neutral" as const, display_order: 7 },
  { label: "Talent Gap", value: "67%", numeric_value: 67, trend: "up" as const, display_order: 8 },
] as const;
