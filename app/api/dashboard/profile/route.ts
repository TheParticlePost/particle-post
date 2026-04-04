import { NextRequest, NextResponse } from "next/server";
import { verifySpecialist } from "@/lib/api-auth-specialist";
import { getServiceClient } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await verifySpecialist(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ specialist: auth.specialist });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifySpecialist(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Only allow updating these fields
    const editableFields = [
      "display_name", "headline", "bio", "avatar_url",
      "categories", "industries", "location_city", "country_code",
      "languages", "hourly_rate_range", "team_size", "certifications",
      "linkedin_url", "website_url",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of editableFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Validate required fields if they're being updated
    if (updates.display_name !== undefined && !String(updates.display_name).trim()) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }
    if (updates.headline !== undefined && !String(updates.headline).trim()) {
      return NextResponse.json({ error: "Headline is required" }, { status: 400 });
    }
    if (updates.linkedin_url !== undefined && !String(updates.linkedin_url).trim()) {
      return NextResponse.json({ error: "LinkedIn URL is required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("specialists")
      .update(updates)
      .eq("id", auth.specialistId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ specialist: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
