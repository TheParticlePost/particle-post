import { NextRequest, NextResponse } from "next/server";
import { verifySpecialist } from "@/lib/api-auth-specialist";
import { getServiceClient } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await verifySpecialist(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";

    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const supabase = getServiceClient();

    // Get analytics events for the period
    const { data: events } = await supabase
      .from("specialist_analytics_events")
      .select("event_type, created_at")
      .eq("specialist_id", auth.specialistId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    // Get leads for the period
    const { data: leads } = await supabase
      .from("specialist_leads")
      .select("status, created_at")
      .eq("specialist_id", auth.specialistId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    // Aggregate by day
    const dailyViews: Record<string, number> = {};
    const dailyLeads: Record<string, number> = {};

    for (const event of events ?? []) {
      if (event.event_type === "profile_view") {
        const day = event.created_at.split("T")[0];
        dailyViews[day] = (dailyViews[day] || 0) + 1;
      }
    }

    for (const lead of leads ?? []) {
      const day = lead.created_at.split("T")[0];
      dailyLeads[day] = (dailyLeads[day] || 0) + 1;
    }

    // Build time series
    const viewsSeries: { date: string; count: number }[] = [];
    const leadsSeries: { date: string; count: number }[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      viewsSeries.push({ date: key, count: dailyViews[key] || 0 });
      leadsSeries.push({ date: key, count: dailyLeads[key] || 0 });
    }

    // Lead status breakdown
    const statusBreakdown: Record<string, number> = {};
    for (const lead of leads ?? []) {
      statusBreakdown[lead.status] = (statusBreakdown[lead.status] || 0) + 1;
    }

    return NextResponse.json({
      period,
      views: viewsSeries,
      leads: leadsSeries,
      statusBreakdown,
      totals: {
        views: viewsSeries.reduce((s, d) => s + d.count, 0),
        leads: leadsSeries.reduce((s, d) => s + d.count, 0),
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
