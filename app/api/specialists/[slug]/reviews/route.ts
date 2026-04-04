import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

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

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const supabase = getSupabaseClient();

    // Find specialist
    const { data: specialist } = await supabase
      .from("specialists")
      .select("id")
      .eq("slug", slug)
      .eq("status", "approved")
      .maybeSingle();

    if (!specialist) {
      return NextResponse.json({ error: "Specialist not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("specialist_reviews")
      .select("id, reviewer_name, reviewer_company, rating, title, body, created_at")
      .eq("specialist_id", specialist.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
    }

    return NextResponse.json({ reviews: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { slug } = await context.params;
    const body = await req.json();

    if (!body.reviewer_name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.reviewer_email?.trim() || !EMAIL_RE.test(body.reviewer_email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data: specialist } = await supabase
      .from("specialists")
      .select("id")
      .eq("slug", slug)
      .eq("status", "approved")
      .maybeSingle();

    if (!specialist) {
      return NextResponse.json({ error: "Specialist not found" }, { status: 404 });
    }

    const { error: insertError } = await supabase.from("specialist_reviews").insert({
      specialist_id: specialist.id,
      reviewer_name: body.reviewer_name.trim(),
      reviewer_email: body.reviewer_email.trim().toLowerCase(),
      reviewer_company: body.reviewer_company?.trim() || null,
      rating: body.rating,
      title: body.title?.trim() || null,
      body: body.body?.trim() || null,
      status: "pending",
    });

    if (insertError) {
      console.error("Review creation error:", insertError);
      return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
