import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("specialists")
      .select(`
        id, slug, type, display_name, headline, bio, avatar_url,
        categories, industries, location_city, country_code, languages,
        hourly_rate_range, team_size, certifications, website_url,
        is_available, is_verified, is_featured, avg_rating, total_reviews,
        profile_views, created_at, updated_at
      `)
      .eq("slug", slug)
      .eq("status", "approved")
      .maybeSingle();

    if (error) {
      console.error("Specialist fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch specialist" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Specialist not found" }, { status: 404 });
    }

    // Increment profile views
    await supabase
      .from("specialists")
      .update({ profile_views: (data.profile_views || 0) + 1 })
      .eq("id", data.id);

    return NextResponse.json({ specialist: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
