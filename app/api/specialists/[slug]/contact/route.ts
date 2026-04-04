import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { sendLeadNotification } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { slug } = await context.params;
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

    const supabase = getSupabaseClient();

    // Find specialist by slug (include email for notification)
    const { data: specialist, error: findError } = await supabase
      .from("specialists")
      .select("id, email, display_name")
      .eq("slug", slug)
      .eq("status", "approved")
      .maybeSingle();

    if (findError || !specialist) {
      return NextResponse.json({ error: "Specialist not found" }, { status: 404 });
    }

    // Create lead
    const { error: insertError } = await supabase.from("specialist_leads").insert({
      specialist_id: specialist.id,
      client_name: body.client_name.trim(),
      client_email: body.client_email.trim().toLowerCase(),
      client_company: body.client_company?.trim() || null,
      project_description: body.project_description.trim(),
      budget_range: body.budget_range || null,
      timeline: body.timeline || null,
    });

    if (insertError) {
      console.error("Lead creation error:", insertError);
      return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 });
    }

    // Send email notification to specialist
    if (specialist.email) {
      sendLeadNotification(specialist.email, specialist.display_name, {
        client_name: body.client_name.trim(),
        client_company: body.client_company?.trim() || null,
        project_description: body.project_description.trim(),
        budget_range: body.budget_range || null,
      }).catch((err) => console.error("Lead email error:", err));
    }

    // Record analytics event
    supabase
      .from("specialist_analytics_events")
      .insert({
        specialist_id: specialist.id,
        event_type: "lead_submitted",
        metadata: { client_name: body.client_name.trim() },
      })
      .then(({ error }) => {
        if (error) console.error("Analytics insert error:", error);
      });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
