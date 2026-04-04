import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseClient();

    // Get the brief
    const { data: brief, error: briefError } = await supabase
      .from("project_briefs")
      .select(`
        id, categories, industries, country_code, languages,
        budget_range, timeline, project_description, match_count,
        status, matched_at, created_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (briefError || !brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    // Get match results with specialist data
    const { data: matches, error: matchError } = await supabase
      .from("automatch_results")
      .select(`
        id, match_score, category_score, geo_score, rating_score,
        availability_score, language_score, rank,
        specialist_id
      `)
      .eq("brief_id", id)
      .order("rank", { ascending: true });

    if (matchError) {
      return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
    }

    // Fetch specialist details for each match
    const specialistIds = (matches ?? []).map((m) => m.specialist_id);
    const { data: specialists } = await supabase
      .from("specialists")
      .select(
        "id, slug, display_name, headline, avatar_url, categories, location_city, country_code, languages, is_available, is_verified, avg_rating, total_reviews"
      )
      .in("id", specialistIds)
      .eq("status", "approved");

    const specialistMap = new Map(
      (specialists ?? []).map((s) => [s.id, s])
    );

    const enrichedMatches = (matches ?? [])
      .map((m) => ({
        ...m,
        specialist: specialistMap.get(m.specialist_id) || null,
      }))
      .filter((m) => m.specialist !== null);

    return NextResponse.json({ brief, matches: enrichedMatches });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
