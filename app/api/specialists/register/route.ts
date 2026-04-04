import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseClient } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    // Verify authenticated user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    const required = ["display_name", "headline", "location_city", "linkedin_url"];
    for (const field of required) {
      if (!body[field]?.trim()) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    if (!body.categories?.length) {
      return NextResponse.json(
        { error: "At least one category is required" },
        { status: 400 }
      );
    }

    // Generate unique slug
    const supabase = getSupabaseClient();
    let slug = slugify(body.display_name);

    // Check for slug collision
    const { data: existing } = await supabase
      .from("specialists")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Check if user already has a specialist profile
    const { data: existingProfile } = await supabase
      .from("specialists")
      .select("id, slug")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: "You already have a specialist profile", slug: existingProfile.slug },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("specialists")
      .insert({
        user_id: user.id,
        email: user.email || null,
        slug,
        type: body.type || "individual",
        display_name: body.display_name.trim(),
        headline: body.headline.trim(),
        bio: body.bio?.trim() || null,
        avatar_url: body.avatar_url?.trim() || null,
        categories: body.categories,
        industries: body.industries || [],
        location_city: body.location_city.trim(),
        country_code: body.country_code || "US",
        languages: body.languages || ["en"],
        hourly_rate_range: body.hourly_rate_range || null,
        team_size: body.team_size || null,
        certifications: body.certifications || [],
        linkedin_url: body.linkedin_url.trim(),
        website_url: body.website_url?.trim() || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Specialist registration error:", error);
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ specialist: data, slug }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
