import type { Specialist, ProjectBrief, AutomatchResult } from "./types";

interface ScoredSpecialist {
  specialist: Specialist;
  matchScore: number;
  categoryScore: number;
  geoScore: number;
  ratingScore: number;
  availabilityScore: number;
  languageScore: number;
}

const WEIGHTS = {
  category: 0.3,
  geo: 0.25,
  rating: 0.2,
  availability: 0.15,
  language: 0.1,
};

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function computeGeoScore(
  briefCountry: string,
  specialistCountry: string
): number {
  if (!briefCountry) return 0.7; // no preference
  return briefCountry === specialistCountry ? 1.0 : 0.5;
}

function computeRatingScore(avgRating: number, totalReviews: number): number {
  if (totalReviews === 0) return 0.5; // neutral
  return avgRating / 5.0;
}

function computeLanguageScore(
  briefLanguages: string[],
  specialistLanguages: string[]
): number {
  if (briefLanguages.length === 0) return 1.0; // no preference
  const specialistSet = new Set(specialistLanguages);
  const matches = briefLanguages.filter((l) => specialistSet.has(l)).length;
  return matches / briefLanguages.length;
}

export function scoreSpecialists(
  brief: ProjectBrief,
  specialists: Specialist[]
): ScoredSpecialist[] {
  const results: ScoredSpecialist[] = [];

  for (const specialist of specialists) {
    const categoryScore = jaccardSimilarity(
      brief.categories,
      specialist.categories
    );

    // Skip specialists with zero category overlap
    if (categoryScore === 0 && brief.categories.length > 0) continue;

    const geoScore = computeGeoScore(brief.country_code, specialist.country_code);
    const ratingScore = computeRatingScore(
      specialist.avg_rating,
      specialist.total_reviews
    );
    const availabilityScore = specialist.is_available ? 1.0 : 0.0;
    const languageScore = computeLanguageScore(
      brief.languages,
      specialist.languages
    );

    const matchScore =
      WEIGHTS.category * categoryScore +
      WEIGHTS.geo * geoScore +
      WEIGHTS.rating * ratingScore +
      WEIGHTS.availability * availabilityScore +
      WEIGHTS.language * languageScore;

    results.push({
      specialist,
      matchScore,
      categoryScore,
      geoScore,
      ratingScore,
      availabilityScore,
      languageScore,
    });
  }

  // Sort descending by match score
  results.sort((a, b) => b.matchScore - a.matchScore);

  return results.slice(0, 10);
}

export function toAutomatchResults(
  briefId: string,
  scored: ScoredSpecialist[]
): Omit<AutomatchResult, "id" | "created_at" | "specialist">[] {
  return scored.map((s, index) => ({
    brief_id: briefId,
    specialist_id: s.specialist.id,
    match_score: Math.round(s.matchScore * 1000) / 1000,
    category_score: Math.round(s.categoryScore * 1000) / 1000,
    geo_score: Math.round(s.geoScore * 1000) / 1000,
    rating_score: Math.round(s.ratingScore * 1000) / 1000,
    availability_score: Math.round(s.availabilityScore * 1000) / 1000,
    language_score: Math.round(s.languageScore * 1000) / 1000,
    rank: index + 1,
    notified_at: null,
  }));
}
