import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { scoreSpecialists, toAutomatchResults } from "@/lib/specialists/automatch";
import { sendMatchNotification } from "@/lib/email";
import type { Specialist, ProjectBrief } from "@/lib/specialists/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 3;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    // Validate
    if (!body.client_name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.client_email?.trim() || !EMAIL_RE.test(body.client_email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!body.project_description?.trim()) {
      return NextResponse.json({ error: "Project description is required" }, { status: 400 });
    }
    if (!body.categories?.length) {
      return NextResponse.json({ error: "At least one category is required" }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Create the project brief
    const { data: brief, error: briefError } = await supabase
      .from("project_briefs")
      .insert({
        client_name: body.client_name.trim(),
        client_email: body.client_email.trim().toLowerCase(),
        client_company: body.client_company?.trim() || null,
        categories: body.categories,
        industries: body.industries || [],
        country_code: body.country_code || "US",
        languages: body.languages || ["en"],
        budget_range: body.budget_range || null,
        timeline: body.timeline || null,
        project_description: body.project_description.trim(),
      })
      .select()
      .single();

    if (briefError || !brief) {
      console.error("Brief creation error:", briefError);
      return NextResponse.json({ error: "Failed to create brief" }, { status: 500 });
    }

    // Fetch all approved specialists
    const { data: specialists } = await supabase
      .from("specialists")
      .select("*")
      .eq("status", "approved");

    if (!specialists || specialists.length === 0) {
      return NextResponse.json({
        brief_id: brief.id,
        matches: [],
        message: "No specialists available yet. We will notify you when matches are found.",
      });
    }

    // Run automatch
    const scored = scoreSpecialists(brief as ProjectBrief, specialists as Specialist[]);

    if (scored.length === 0) {
      return NextResponse.json({
        brief_id: brief.id,
        matches: [],
        message: "No specialists matched your criteria. Try broadening your categories.",
      });
    }

    // Store results
    const matchRows = toAutomatchResults(brief.id, scored);
    const { error: matchError } = await supabase
      .from("automatch_results")
      .insert(matchRows);

    if (matchError) {
      console.error("Match insert error:", matchError);
    }

    // Update brief
    await supabase
      .from("project_briefs")
      .update({
        match_count: scored.length,
        status: "matched",
        matched_at: new Date().toISOString(),
      })
      .eq("id", brief.id);

    // Send email notifications to top 5
    const top5 = scored.slice(0, 5);
    for (const match of top5) {
      if (match.specialist.email) {
        await sendMatchNotification(
          match.specialist.email,
          match.specialist.display_name,
          {
            client_name: brief.client_name,
            client_company: brief.client_company,
            project_description: brief.project_description,
            categories: brief.categories,
          },
          scored.indexOf(match) + 1,
          match.matchScore
        );

        // Record analytics event
        await supabase.from("specialist_analytics_events").insert({
          specialist_id: match.specialist.id,
          event_type: "match_received",
          metadata: { brief_id: brief.id, rank: scored.indexOf(match) + 1 },
        });

        // Mark as notified
        await supabase
          .from("automatch_results")
          .update({ notified_at: new Date().toISOString() })
          .eq("brief_id", brief.id)
          .eq("specialist_id", match.specialist.id);
      }
    }

    return NextResponse.json({
      brief_id: brief.id,
      matches: scored.map((s, i) => ({
        rank: i + 1,
        match_score: Math.round(s.matchScore * 100),
        specialist: {
          id: s.specialist.id,
          slug: s.specialist.slug,
          display_name: s.specialist.display_name,
          headline: s.specialist.headline,
          avatar_url: s.specialist.avatar_url,
          categories: s.specialist.categories,
          location_city: s.specialist.location_city,
          country_code: s.specialist.country_code,
          is_available: s.specialist.is_available,
          is_verified: s.specialist.is_verified,
          avg_rating: s.specialist.avg_rating,
          total_reviews: s.specialist.total_reviews,
        },
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
