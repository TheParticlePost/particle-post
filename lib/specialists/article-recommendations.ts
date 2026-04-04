import { createClient } from "@/lib/supabase/server";

interface RecommendedSpecialist {
  slug: string;
  display_name: string;
  headline: string | null;
  avatar_url: string | null;
  categories: string[];
  hourly_rate_range: string | null;
  score: number;
}

/**
 * Find approved, available specialists matching an article's categories.
 * Returns up to `limit` specialists ranked by category overlap.
 */
export async function getRelevantSpecialists(
  articleCategories: string[],
  limit = 3
): Promise<RecommendedSpecialist[]> {
  if (!articleCategories || articleCategories.length === 0) return [];

  try {
    const supabase = await createClient();

    const { data: specialists } = await supabase
      .from("specialists")
      .select(
        "slug, display_name, headline, avatar_url, categories, hourly_rate_range"
      )
      .eq("status", "approved")
      .eq("is_available", true)
      .limit(20);

    if (!specialists || specialists.length === 0) return [];

    const articleCatsLower = articleCategories.map((c) => c.toLowerCase());

    const scored = specialists
      .map((s) => {
        const specCats = (s.categories || []).map((c: string) =>
          c.toLowerCase()
        );
        const overlap = articleCatsLower.filter((c) =>
          specCats.includes(c)
        ).length;
        return { ...s, score: overlap } as RecommendedSpecialist;
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  } catch {
    // Silently fail — don't block article rendering
    return [];
  }
}
