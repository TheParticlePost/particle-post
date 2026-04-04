import { createClient } from "@/lib/supabase/server";
import type {
  Specialist,
  SpecialistListItem,
  PortfolioItem,
  SpecialistReview,
  SpecialistFilters,
} from "./types";

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

const LIST_FIELDS = `
  id, slug, type, display_name, headline, avatar_url,
  categories, location_city, country_code, languages,
  hourly_rate_range, is_available, is_verified, is_featured,
  avg_rating, total_reviews
`;

export async function getApprovedSpecialists(
  filters: SpecialistFilters = {}
): Promise<{ specialists: SpecialistListItem[]; total: number }> {
  if (!isSupabaseConfigured()) return { specialists: [], total: 0 };
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 12, 50);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("specialists")
    .select(LIST_FIELDS, { count: "exact" })
    .eq("status", "approved");

  if (filters.category) {
    query = query.contains("categories", [filters.category]);
  }

  if (filters.country) {
    query = query.eq("country_code", filters.country);
  }

  if (filters.language) {
    query = query.contains("languages", [filters.language]);
  }

  if (filters.availability === "available") {
    query = query.eq("is_available", true);
  }

  if (filters.q) {
    const sanitized = filters.q.replace(/[%_\\]/g, "\\$&");
    query = query.or(
      `display_name.ilike.%${sanitized}%,headline.ilike.%${sanitized}%`
    );
  }

  // Featured first, then by rating
  query = query
    .order("is_featured", { ascending: false })
    .order("avg_rating", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching specialists:", error);
    return { specialists: [], total: 0 };
  }

  return {
    specialists: (data as SpecialistListItem[]) ?? [],
    total: count ?? 0,
  };
}

export async function getSpecialistBySlug(
  slug: string
): Promise<Specialist | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("specialists")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    console.error("Error fetching specialist:", error);
    return null;
  }

  return data as Specialist | null;
}

export async function getPortfolioItems(
  specialistId: string
): Promise<PortfolioItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("specialist_id", specialistId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching portfolio:", error);
    return [];
  }

  return (data as PortfolioItem[]) ?? [];
}

export async function getApprovedReviews(
  specialistId: string
): Promise<SpecialistReview[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("specialist_reviews")
    .select("*")
    .eq("specialist_id", specialistId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }

  return (data as SpecialistReview[]) ?? [];
}

export async function getSpecialistForUser(
  userId: string
): Promise<Specialist | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("specialists")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching specialist for user:", error);
    return null;
  }

  return data as Specialist | null;
}
