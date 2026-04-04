import { NextRequest, NextResponse } from "next/server";
import { verifySpecialist } from "@/lib/api-auth-specialist";
import { getServiceClient } from "@/lib/api-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await verifySpecialist(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();

    const validStatuses = ["new", "viewed", "responded", "archived"];
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verify lead belongs to this specialist
    const { data: lead } = await supabase
      .from("specialist_leads")
      .select("specialist_id")
      .eq("id", id)
      .maybeSingle();

    if (!lead || lead.specialist_id !== auth.specialistId) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { status: body.status };
    if (body.status === "viewed") {
      updates.viewed_at = new Date().toISOString();
    }
    if (body.status === "responded") {
      updates.responded_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("specialist_leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }

    return NextResponse.json({ lead: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
