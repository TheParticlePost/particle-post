import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const country = searchParams.get("country");
    const language = searchParams.get("language");
    const availability = searchParams.get("availability");
    const q = searchParams.get("q");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const offset = (page - 1) * limit;

    const supabase = getSupabaseClient();

    let query = supabase
      .from("specialists")
      .select(
        "id, slug, type, display_name, headline, avatar_url, categories, location_city, country_code, languages, hourly_rate_range, is_available, is_verified, is_featured, avg_rating, total_reviews",
        { count: "exact" }
      )
      .eq("status", "approved");

    if (category) {
      query = query.contains("categories", [category]);
    }
    if (country) {
      query = query.eq("country_code", country);
    }
    if (language) {
      query = query.contains("languages", [language]);
    }
    if (availability === "available") {
      query = query.eq("is_available", true);
    }
    if (q) {
      const sanitized = q.replace(/[%_\\]/g, "\\$&");
      query = query.or(
        `display_name.ilike.%${sanitized}%,headline.ilike.%${sanitized}%`
      );
    }

    query = query
      .order("is_featured", { ascending: false })
      .order("avg_rating", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("Specialists query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch specialists" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      specialists: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
