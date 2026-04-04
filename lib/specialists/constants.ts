export const SPECIALIST_CATEGORIES = [
  { name: "AI Strategy & Consulting", slug: "ai-strategy", color: "#E8552E" },
  { name: "ML Engineering & Deployment", slug: "ml-engineering", color: "#D4962A" },
  { name: "NLP & Language AI", slug: "nlp", color: "#5A7FA0" },
  { name: "Computer Vision", slug: "computer-vision", color: "#2D9B5A" },
  { name: "Automation & AI Agents", slug: "automation", color: "#A89E94" },
  { name: "Data Engineering & Analytics", slug: "data-engineering", color: "#9B6E2D" },
  { name: "AI Governance & Compliance", slug: "ai-governance", color: "#7A5AA0" },
  { name: "AI Training & Upskilling", slug: "ai-training", color: "#5A9B8A" },
  { name: "Custom / Other", slug: "custom", color: "#6E6660" },
] as const;

export const SPECIALIST_INDUSTRIES = [
  "Financial Services",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Legal",
  "Energy",
  "Government",
  "Education",
  "Media",
  "SaaS / Tech",
  "Professional Services",
] as const;

export const RATE_RANGES = [
  { label: "$150–250/hr", value: "150-250" },
  { label: "$250–500/hr", value: "250-500" },
  { label: "$500+/hr", value: "500+" },
  { label: "Project-based", value: "project" },
] as const;

export const TEAM_SIZES = [
  { label: "2–5", value: "2-5" },
  { label: "6–20", value: "6-20" },
  { label: "21–50", value: "21-50" },
  { label: "50+", value: "50+" },
] as const;

export const LANGUAGES = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "Spanish", value: "es" },
  { label: "German", value: "de" },
  { label: "Mandarin", value: "zh" },
  { label: "Japanese", value: "ja" },
  { label: "Portuguese", value: "pt" },
  { label: "Arabic", value: "ar" },
  { label: "Hindi", value: "hi" },
  { label: "Korean", value: "ko" },
] as const;

export const COUNTRIES = [
  { label: "United States", value: "US" },
  { label: "Canada", value: "CA" },
  { label: "United Kingdom", value: "GB" },
  { label: "Germany", value: "DE" },
  { label: "France", value: "FR" },
  { label: "Australia", value: "AU" },
  { label: "India", value: "IN" },
  { label: "Singapore", value: "SG" },
  { label: "Japan", value: "JP" },
  { label: "Brazil", value: "BR" },
  { label: "Netherlands", value: "NL" },
  { label: "Switzerland", value: "CH" },
  { label: "Israel", value: "IL" },
  { label: "South Korea", value: "KR" },
  { label: "UAE", value: "AE" },
] as const;

export function getCategoryBySlug(slug: string) {
  return SPECIALIST_CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoryLabel(slug: string): string {
  return getCategoryBySlug(slug)?.name ?? slug;
}

export function getCategoryColor(slug: string): string {
  return getCategoryBySlug(slug)?.color ?? "#6E6660";
}

export function getCountryLabel(code: string): string {
  return COUNTRIES.find((c) => c.value === code)?.label ?? code;
}

export function getLanguageLabel(code: string): string {
  return LANGUAGES.find((l) => l.value === code)?.label ?? code;
}
